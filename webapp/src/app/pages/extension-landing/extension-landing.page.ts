import { Component, Inject, OnInit, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BasePage } from '../base-page';
import {
  ClassifierService,
  ClassifierSchema,
  NormalizedClassifierResult,
} from '../../core/services/classifier.service';

/** Whether the extension provides `window.Classifier` on this page. Chrome has no native implementation yet. */
export type ClassifierProvider = 'checking' | 'extension' | 'none';

@Component({
  selector: 'app-extension-landing',
  templateUrl: './extension-landing.page.html',
  styleUrls: ['./extension-landing.page.scss'],
  standalone: false
})
export class ExtensionLandingPage extends BasePage implements OnInit {
  readonly webStoreUrl = 'https://chromewebstore.google.com/detail/webai-extension/lmjgpcigjcffnphimblhcoccjfefamcp';

  activeTab: string = 'classifier';

  /** Live detection of the polyfill on this very page. */
  classifierProvider: ClassifierProvider = 'checking';

  readonly demoSchema: ClassifierSchema = {
    context: 'Document editor command palette',
    questions: [
      {
        id: 'command',
        type: 'categorical',
        prompt: "Which command best fulfills the user's goal?",
        options: [
          { label: 'export_pdf', description: 'Download or save the document as a PDF' },
          { label: 'share_link', description: 'Invite collaborators or copy a sharing link' },
          { label: 'archive_doc', description: 'Move the document to trash or archive' }
        ]
      },
      { id: 'is_destructive', type: 'binary', prompt: 'Would this action delete or hide content?' }
    ]
  };
  readonly demoSamples = [
    'let my coworkers view this file',
    'I need a copy I can print',
    'get rid of this old draft'
  ];
  demoInput = this.demoSamples[0];
  demoResult: NormalizedClassifierResult | null = null;
  demoBusy = false;
  demoError = '';
  demoDownloading = false;
  demoProgress = 0;

  readonly demoCode = `const classifier = await Classifier.create({
  context: "Document editor command palette",
  questions: [
    {
      id: "command",
      type: "categorical",
      prompt: "Which command best fulfills the user's goal?",
      options: [
        { label: "export_pdf", description: "Download or save the document as a PDF" },
        { label: "share_link", description: "Invite collaborators or copy a sharing link" },
        { label: "archive_doc", description: "Move the document to trash or archive" }
      ]
    }
  ]
});

// The result is a record keyed by question id, so destructure directly.
const { command } = await classifier.classify("let my coworkers view this file");
// command -> { id: "command", label: "share_link", confidence: 0.93, probabilities: [...] }
console.log(command.label, command.confidence.toFixed(3), command.probabilities);
classifier.destroy();`;

  private readonly isBrowser: boolean;

  constructor(
    title: Title,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly classifierService: ClassifierService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {
    super(document, title);
    this.isBrowser = isPlatformBrowser(platformId);
    this.setTitle("Extension");
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.isBrowser) {
      this.detectClassifierProvider();
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  detectClassifierProvider(): void {
    // Only the extension provides window.Classifier today; a bare `Classifier`
    // global without the polyfill marker comes from an older extension build.
    this.classifierProvider = this.classifierService.isSupported() ? 'extension' : 'none';
    this.cdr.detectChanges();
  }

  get demoAvailable(): boolean {
    return this.classifierProvider === 'extension';
  }

  async runDemo(): Promise<void> {
    if (this.demoBusy || !this.demoAvailable || !this.demoInput.trim()) return;
    this.demoBusy = true;
    this.demoError = '';
    this.demoResult = null;
    this.cdr.detectChanges();
    try {
      this.demoResult = await this.classifierService.classify(this.demoSchema, this.demoInput, {
        onDownloadProgress: (loaded) => this.ngZone.run(() => {
          this.demoDownloading = loaded < 1;
          this.demoProgress = Math.round(loaded * 100);
          this.cdr.detectChanges();
        })
      });
    } catch (e: any) {
      this.demoError = `${e?.name ?? 'Error'}: ${e?.message ?? e}`;
    } finally {
      this.demoBusy = false;
      this.demoDownloading = false;
      this.cdr.detectChanges();
    }
  }
}
