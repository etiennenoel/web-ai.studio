import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import type { NoteEditor } from './note-codemirror';

declare const Summarizer: any;

/** How long after the last keystroke before a title suggestion is triggered automatically. */
const SUGGEST_DEBOUNCE_MS = 1500;

/** Body must have at least this many characters before a title is worth suggesting. */
const MIN_CONTENT_LENGTH = 40;

/** Four paragraphs of realistic note content, so a timing run is one click away on an empty note. */
const SAMPLE_TEXT = `The Web AI Platform brings on-device machine learning directly into the browser, letting web applications run inference without sending user data to a server. Chrome's Built-In AI APIs expose task-specific capabilities — summarization, translation, proofreading and free-form prompting — all backed by Gemini Nano running locally on the user's hardware.

Running models on-device changes the privacy story completely. A note-taking app can suggest titles, a mail client can draft replies, and a support tool can triage tickets, all without a single byte of the user's text leaving the machine. It also means the features keep working offline, on a plane or in a tunnel, exactly when cloud-backed assistants go dark.

Performance is the trade-off to watch. The first call to \`create()\` may need to load the model into memory, which can take seconds on a cold start, while subsequent calls reuse the warm session and return in a fraction of the time. Measuring availability checks, session creation and inference separately is the only way to understand where the time actually goes.

This page exists to make those measurements visible. Type into the note, or use this sample text, and watch the timing table fill in: each run records how long the availability check, the session creation and the summarize call took, so cold and warm paths can be compared side by side.`;

interface TimingRun {
  run: number;
  trigger: 'auto' | 'manual';
  availabilityMs: number | null;
  createMs: number | null;
  sessionReused: boolean;
  summarizeMs: number | null;
  totalMs: number | null;
  inputChars: number;
  title: string;
  error: string | null;
}

@Component({
  selector: 'app-labs-note-editor',
  templateUrl: './note-editor.page.html',
  styleUrl: './note-editor.page.scss',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' },
})
export class NoteEditorPage implements OnInit, OnDestroy {
  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('editorHost', { static: false }) editorHost?: ElementRef<HTMLDivElement>;

  title = '';
  content = '';

  availabilityStatus: string | null = null;
  isSummarizing = false;
  /** Runs a summarization automatically on page load (sample text is inserted if the note is empty). */
  autoRunOnLoad = false;
  errorMessage = '';
  timings: TimingRun[] = [];

  /** Once the user types their own title, auto-suggestions stop overwriting it. */
  private titleManuallyEdited = false;
  /** The on-load run fires once — a remount of the editor must not re-trigger it. */
  private autoRanOnLoad = false;
  private editor: NoteEditor | null = null;
  private remountObserver: MutationObserver | null = null;
  private session: any = null;
  private suggestTimer: ReturnType<typeof setTimeout> | null = null;
  private runCounter = 0;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    const autorun = this.route.snapshot.queryParamMap.get('autorun');
    this.autoRunOnLoad = autorun === 'true' || autorun === '1';

    // Mount as soon as the view exists. Anything that later re-creates the view DOM under us
    // (HMR, hydration cleanup) is handled by the remount observer — waiting on whenStable() here
    // was tried instead and stalls indefinitely when something keeps the zone busy.
    setTimeout(() => void this.mountEditor(), 0);
  }

  onAutoRunToggle(event: Event): void {
    this.autoRunOnLoad = (event.target as HTMLInputElement).checked;
    // Show right away what the on-load run will summarize — an armed toggle over an empty note
    // reads as "nothing will happen".
    if (this.autoRunOnLoad && !this.content.trim()) {
      this.insertSampleText();
    }
    // Reflected in the URL so a reload (or a shared link) reproduces the run.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { autorun: this.autoRunOnLoad ? 'true' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  ngOnDestroy(): void {
    this.clearSuggestTimer();
    this.remountObserver?.disconnect();
    this.remountObserver = null;
    this.editor?.destroy();
    this.editor = null;
    this.session?.destroy?.();
    this.session = null;
  }

  private async mountEditor(): Promise<void> {
    const host = this.editorHost?.nativeElement;
    if (!host || this.editor) {
      return;
    }

    // Dynamically imported: CodeMirror is browser-only and heavy, and must never be pulled into
    // the SSR bundle or the initial chunk.
    const { createNoteEditor } = await import('./note-codemirror');

    // Outside the zone on purpose: CodeMirror drives its own update cycle and would otherwise fire
    // change detection on every keystroke, selection move and measure.
    this.zone.runOutsideAngular(() => {
      this.editor = createNoteEditor({
        parent: host,
        doc: this.content,
        placeholder: 'Start writing… markdown renders as you type.',
        onDocChange: (text) => this.zone.run(() => this.onContentChange(text)),
        onArrowUpAtTop: () => this.zone.run(() => this.focusTitleEnd()),
      });
    });

    this.watchForDetachedEditor();

    // The view may have been re-created while the CodeMirror chunk was loading — in that window the
    // observer was not registered yet, so check once by hand and remount into the fresh host.
    // Cast needed: TS narrows `this.editor` to null here because the assignment happens inside
    // the runOutsideAngular closure above.
    const mounted = this.editor as NoteEditor | null;
    if (mounted && !mounted.view.dom.isConnected) {
      mounted.destroy();
      this.editor = null;
      setTimeout(() => void this.mountEditor(), 0);
      return;
    }

    if (this.autoRunOnLoad && !this.autoRanOnLoad) {
      this.autoRanOnLoad = true;
      // Nothing to summarize on a fresh page, so the sample text stands in; then run right away
      // instead of waiting out the typing debounce.
      if (!this.content.trim()) {
        this.insertSampleText();
      }
      this.clearSuggestTimer();
      void this.summarize('auto');
    }
  }

  /**
   * Angular can re-create this component's view DOM while the instance survives — the dev server's
   * HMR does it on every load that follows a file edit (ɵɵreplaceMetadata → recreateLView), and it
   * silently throws away the CodeMirror DOM with it. Watch the component element for that and
   * remount the editor into the fresh host, restoring the text from `content`.
   */
  private watchForDetachedEditor(): void {
    if (this.remountObserver) {
      return;
    }

    this.remountObserver = new MutationObserver(() => {
      if (!this.editor || this.editor.view.dom.isConnected) {
        return;
      }
      this.editor.destroy();
      this.editor = null;
      // Next tick: the new view (and the #editorHost ViewChild) must be in place first.
      setTimeout(() => void this.mountEditor(), 0);
    });
    this.remountObserver.observe(this.elementRef.nativeElement, { childList: true, subtree: true });
  }

  private onContentChange(text: string): void {
    this.content = text;
    this.scheduleAutoSuggest();
  }

  onTitleInput(event: Event): void {
    this.title = (event.target as HTMLInputElement).value;
    this.titleManuallyEdited = this.title.trim().length > 0;
  }

  /** Down or Enter from the title continues into the note body, like Apple Notes. */
  onTitleKeydown(event: KeyboardEvent): void {
    if ((event.key !== 'ArrowDown' && event.key !== 'Enter') || !this.editor) {
      return;
    }
    event.preventDefault();
    this.editor.focusAt(0);
  }

  private focusTitleEnd(): void {
    const input = this.titleInput?.nativeElement;
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }

  private scheduleAutoSuggest(): void {
    this.clearSuggestTimer();
    if (this.titleManuallyEdited || this.content.trim().length < MIN_CONTENT_LENGTH) {
      return;
    }
    this.suggestTimer = setTimeout(() => {
      this.suggestTimer = null;
      void this.summarize('auto');
    }, SUGGEST_DEBOUNCE_MS);
  }

  private clearSuggestTimer(): void {
    if (this.suggestTimer) {
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
    }
  }

  insertSampleText(): void {
    if (this.editor) {
      // Goes through the editor so onDocChange fires: content updates and auto-suggest schedules,
      // exactly as if the text had been typed.
      this.editor.setDoc(SAMPLE_TEXT, 0);
      this.editor.focus();
      return;
    }
    // Editor not mounted yet — the mount uses `content` as its initial document, so nothing is lost.
    this.content = SAMPLE_TEXT;
    this.scheduleAutoSuggest();
  }

  onSummarizeClick(): void {
    this.clearSuggestTimer();
    void this.summarize('manual');
  }

  get summarizerSupported(): boolean {
    return this.isBrowser && typeof (globalThis as any).Summarizer !== 'undefined';
  }

  /**
   * One full suggestion pass, with every phase timed independently:
   * availability() → create() (skipped when the session is reused) → summarize().
   */
  private async summarize(trigger: 'auto' | 'manual'): Promise<void> {
    const input = this.content.trim();
    if (!input || this.isSummarizing) {
      return;
    }

    if (!this.summarizerSupported) {
      this.errorMessage = 'Summarizer API is not available in this browser.';
      return;
    }

    this.isSummarizing = true;
    this.errorMessage = '';

    const row: TimingRun = {
      run: ++this.runCounter,
      trigger,
      availabilityMs: null,
      createMs: null,
      sessionReused: this.session !== null,
      summarizeMs: null,
      totalMs: null,
      inputChars: input.length,
      title: '',
      error: null,
    };
    // Newest run first, inserted immediately so the row fills in phase by phase.
    this.timings = [row, ...this.timings];

    const totalStart = performance.now();

    try {
      const availabilityStart = performance.now();
      const availability = await Summarizer.availability();
      row.availabilityMs = performance.now() - availabilityStart;
      this.availabilityStatus = availability;
      this.cdr.markForCheck();

      if (availability === 'unavailable') {
        throw new Error('Summarizer is unavailable on this device.');
      }

      if (!this.session) {
        const createStart = performance.now();
        this.session = await Summarizer.create({
          type: 'headline',
          format: 'plain-text',
          length: 'short',
          expectedInputLanguages: ['en'],
          outputLanguage: 'en',
        });
        row.createMs = performance.now() - createStart;
        this.cdr.markForCheck();
      }

      const summarizeStart = performance.now();
      const summary: string = await this.session.summarize(input);
      row.summarizeMs = performance.now() - summarizeStart;
      row.totalMs = performance.now() - totalStart;

      row.title = summary.trim().replace(/^["'#\s]+|["'\s]+$/g, '');
      // Manual runs always apply; auto runs never clobber a title the user typed themselves.
      if (trigger === 'manual' || !this.titleManuallyEdited) {
        this.title = row.title;
      }
    } catch (error: any) {
      row.error = error?.message ?? String(error);
      row.totalMs = performance.now() - totalStart;
      this.errorMessage = row.error ?? '';
      // A failed create leaves no usable session behind.
      if (row.createMs === null && !row.sessionReused) {
        this.session = null;
      }
    } finally {
      this.isSummarizing = false;
      this.cdr.markForCheck();
    }
  }

  destroySession(): void {
    this.session?.destroy?.();
    this.session = null;
  }

  formatMs(value: number | null): string {
    return value === null ? 'N/A' : `${value.toFixed(1)}`;
  }
}
