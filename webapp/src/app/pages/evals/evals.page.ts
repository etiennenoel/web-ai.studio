import {ChangeDetectorRef, Component, DOCUMENT, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {BasePage} from '../base-page';
import {AbstractControl, FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {distinctUntilChanged, map} from 'rxjs';
import {InferenceStatusEnum} from '../../enums/inference-status.enum';
import {ApiEnum} from './api.enum';
import {EvalsRow} from './evals.row';
import {EvalsExecutionEnum} from '../../enums/evals-execution.enum';
import {SpeechQuality, WebSpeechService} from '../../core/services/web-speech.service';
import {MediaSourceUtils} from '../../core/utils/media-source.utils';
import {
  SpreadsheetSheetNotFoundError,
  SpreadsheetUtils,
} from '../../core/utils/spreadsheet.utils';
import {ApiStatusPill} from '../demos/components/api-status/api-status.component';
import {SummarizerOption} from './summarizer-option.interface';
import {PROMPT_SAMPLING_MODES} from '../../core/models/prompt-run.options';

type MediaKind = 'image' | 'audio';
export type EvalsSubtab = 'spreadsheet' | 'manual';

interface ColumnBinding {
  field: keyof EvalsRow;
  index: number;
}

@Component({
  selector: 'page-evals',
  templateUrl: './evals.page.html',
  standalone: false,
  styleUrl: './evals.page.scss',
  host: {
    class: 'block h-full w-full flex flex-col min-h-0'
  }
})
export class EvalsPage extends BasePage implements OnInit, OnDestroy {

  /** Anything bigger than this is almost certainly a mistake in an eval sheet. */
  private static readonly maxMediaBytes = 25 * 1024 * 1024;

  /** The Prompt API squares images to this, so a smaller one has already lost detail. */
  private static readonly minUsefulImageEdge = 768;

  private static readonly apiAliases: Record<string, ApiEnum> = {
    'summarizer': ApiEnum.Summarizer,
    'summariser': ApiEnum.Summarizer,
    'prompt': ApiEnum.Prompt,
    'prompt api': ApiEnum.Prompt,
    'languagemodel': ApiEnum.Prompt,
    'language model': ApiEnum.Prompt,
    'web speech': ApiEnum.WebSpeech,
    'webspeech': ApiEnum.WebSpeech,
    'speech': ApiEnum.WebSpeech,
    'asr': ApiEnum.WebSpeech,
  };

  /**
   * Words a header cell may contain. A cell counts as a heading only when every one of its
   * words is in here, which is what keeps a prose cell like "Context for the test" from being
   * mistaken for the Context heading.
   */
  private static readonly headerVocabulary = new Set([
    'api', 'audio', 'clip', 'clips', 'constraint', 'context', 'expected', 'file', 'files',
    'image', 'images', 'input', 'instruction', 'instructions', 'length', 'link', 'links',
    'mode', 'optional', 'output', 'preference', 'prompt', 'response', 'sampling', 'schema',
    'sound', 'speed', 'structured', 'summariser', 'summarizer', 'system', 'text', 'type',
    'url', 'urls', 'user',
  ]);

  /**
   * Exact canonical spreadsheet column names mapped to Website EvalsRow fields:
   * - API -> api
   * - Context -> context
   * - Input (Text) -> input
   * - Input (Images) -> images
   * - Input (Audio) -> audio
   * - Schema -> schema
   * - Sampling Mode -> samplingMode
   * - Summarizer Length (Optional) -> summarizerLength
   * - Summarizer Type (Optional) -> summarizerType
   * - Summarizer Speed Preference -> summarizerPreference
   */
  private static readonly exactSpreadsheetHeaders: ReadonlyMap<string, keyof EvalsRow> = new Map<
    string,
    keyof EvalsRow
  >([
    ['api', 'api'],
    ['context', 'context'],
    ['input (text)', 'input'],
    ['input (images)', 'images'],
    ['input (audio)', 'audio'],
    ['schema', 'schema'],
    ['sampling mode', 'samplingMode'],
    ['sampling mode (optional)', 'samplingMode'],
    ['summarizer length (optional)', 'summarizerLength'],
    ['summarizer length', 'summarizerLength'],
    ['summarizer type (optional)', 'summarizerType'],
    ['summarizer type', 'summarizerType'],
    ['summarizer speed preference', 'summarizerPreference'],
    ['summarizer speed preference (optional)', 'summarizerPreference'],
  ]);

  /**
   * Which field a heading names, most specific first — so "Input (Images)" binds to images
   * rather than to input.
   */
  private static readonly headerPatterns: [RegExp, keyof EvalsRow][] = [
    [/image/, 'images'],
    [/audio|sound|clip/, 'audio'],
    [/schema|constraint|structured/, 'schema'],
    [/sampling|mode/, 'samplingMode'],
    [/length/, 'summarizerLength'],
    [/type/, 'summarizerType'],
    [/preference|speed/, 'summarizerPreference'],
    [/api/, 'api'],
    [/context|system|instruction/, 'context'],
    [/input|prompt|text/, 'input'],
  ];

  /** The layout a sheet without a header row is assumed to use — unchanged from before. */
  private static readonly positionalColumns: (keyof EvalsRow)[] = ['context', 'input', 'images', 'api'];

  /** Which cells each API actually reads. Everything else is dimmed out on that row. */
  private static readonly apiFields: Record<string, readonly string[]> = {
    [ApiEnum.Prompt]: ['context', 'input', 'images', 'audio', 'schema', 'samplingMode'],
    [ApiEnum.Summarizer]: ['context', 'input', 'summarizer'],
    [ApiEnum.WebSpeech]: ['audio'],
  };

  public static readonly DEFAULT_TEST_SPREADSHEET_URL =
    'https://docs.google.com/spreadsheets/d/1FBdGLn3npctkZc1hmE1JDlxuXXUVo2y4Tv_6yLwfA1Y/edit?gid=0#gid=0';

  public static readonly TEMPLATE_SPREADSHEET_URL =
    'https://docs.google.com/spreadsheets/d/18lCuZ6f3Lehg9rJIYuuFwJq6PfvGzLMEAsi9oAznclk/edit?gid=0#gid=0';

  form: FormGroup;

  activeSubtab: EvalsSubtab = 'spreadsheet';

  isLoadingSheet: boolean = false;

  isLoadingEmbeddedImages: boolean = false;

  sheetLoadProgress: number = 0;

  sheetLoadStage: string = '';

  sheetLoadDetail: string = '';

  sheetLoadElapsedSeconds: number = 0;

  private sheetLoadTimer: ReturnType<typeof setInterval> | null = null;

  private sheetLoadStartedAt: number = 0;

  private sheetLoadPhase: 'packaging' | 'downloading' | 'extracting' | 'idle' = 'idle';

  private allocatedBlobUrls: string[] = [];

  sheetLoadError: string | null = null;

  sheetLoadSuccess: string | null = null;

  availableSheets: string[] = [];

  loadedSheetName: string = '';

  private lastLoadedSheetKey: string = '';

  liveOutputFileHandle: any = null;

  liveOutputFileName: string = '';

  liveOutputLastSavedAt: string = '';

  recoveredCheckpoint: {
    key: string;
    completedCount: number;
    totalRows: number;
    updatedAt: string;
    entries: Record<string, {status: string; output: string}>;
  } | null = null;

  statusMessage?: string;

  status = EvalsExecutionEnum.Idle;

  previewImageSrc: string | null = null;

  previewLoaded: boolean = false;

  showResetConfirmation: boolean = false;

  showAudioImport: boolean = false;

  pendingAudioSources: string[] = [];

  speechStatus: string = 'loading...';

  speechHint: string = '';

  isInstallingSpeechModel: boolean = false;

  /** Feedback for the copy button: cleared again after a short delay. */
  copyFeedback: 'copied' | 'failed' | null = null;

  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  readonly apiOptions: ApiEnum[] = Object.values(ApiEnum);

  readonly samplingModes = PROMPT_SAMPLING_MODES;

  readonly optionalColumns: {field: 'images' | 'audio' | 'schema' | 'samplingMode' | 'summarizer', label: string, icon: string}[] = [
    {field: 'images', label: 'Images', icon: 'bi-image'},
    {field: 'audio', label: 'Audio', icon: 'bi-file-earmark-music'},
    {field: 'schema', label: 'Schema', icon: 'bi-braces'},
    {field: 'samplingMode', label: 'Sampling mode', icon: 'bi-sliders2'},
    {field: 'summarizer', label: 'Summarizer', icon: 'bi-sliders'},
  ];

  /** The three Summarizer create options a row can set, in the order the column shows them. */
  readonly summarizerOptions: SummarizerOption[] = [
    {field: 'summarizerLength', option: 'length', label: 'Length', choices: ['short', 'medium', 'long']},
    {field: 'summarizerType', option: 'type', label: 'Type', choices: ['key-points', 'tldr', 'teaser', 'headline']},
    {field: 'summarizerPreference', option: 'preference', label: 'Speed preference', choices: ['auto', 'speed', 'capability']},
  ];

  /** Optional columns the user asked for even though no row fills them yet. */
  private readonly requestedColumns = new Set<string>();

  readonly qualityLevels = [
    {value: 'command', label: 'Command', hint: 'Short phrases, single speaker, limited vocabulary.'},
    {value: 'dictation', label: 'Dictation', hint: 'Continuous speech, moderate noise, one speaker.'},
    {value: 'conversation', label: 'Conversation', hint: 'Multi-speaker, complex vocabulary, high noise.'},
  ];

  private abortController: AbortController | null = null;

  private activeTranscription: { abort: () => void } | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
    private readonly webSpeech: WebSpeechService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    super(document, title)

    this.setTitle("Evals")
    this.form = this.fb.group({
      settings: this.fb.group({
        spreadsheetUrl: [EvalsPage.DEFAULT_TEST_SPREADSHEET_URL],
        sheetName: [''],
        speechLang: ['en-US'],
        speechQuality: ['dictation'],
        samplingMode: [''],
        omitResponseConstraintInput: [false],
        audioPaths: [''],
      }),
      rows: this.fb.array([this.createRow()])
    });
  }

  override async ngOnInit() {
    super.ngOnInit();

    this.subscriptions.push(
      this.route.data.subscribe(data => {
        if (data?.['evalsSubtab'] === 'spreadsheet') {
          this.activeSubtab = 'spreadsheet';
        } else if (data?.['evalsSubtab'] === 'manual') {
          const tabParam = this.route.snapshot.queryParamMap.get('tab');
          if (tabParam !== 'spreadsheet') {
            this.activeSubtab = 'manual';
          }
        }
      }),
    );

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.document.location.pathname.includes('spreadsheet-upload')) {
      this.activeSubtab = 'spreadsheet';
    }

    this.subscriptions.push(
      this.route.queryParamMap.subscribe(params => {
        const tab = params.get('tab');
        if (tab === 'manual' || tab === 'paste') {
          this.activeSubtab = 'manual';
        } else if (tab === 'spreadsheet') {
          this.activeSubtab = 'spreadsheet';
        }

        const urlParam = params.get('spreadsheetUrl');
        const sheetParam = params.get('sheetName');
        if (urlParam) {
          this.settings.patchValue({spreadsheetUrl: urlParam});
        }
        if (sheetParam !== null) {
          this.settings.patchValue({sheetName: sheetParam});
        }
      }),
    );

    let lastSpreadsheetId =
      SpreadsheetUtils.parseGoogleSpreadsheetInput(
        String(this.settings.value.spreadsheetUrl ?? ''),
      )?.spreadsheetId ?? '';

    this.subscriptions.push(
      this.settings
        .get('spreadsheetUrl')!
        .valueChanges.subscribe(rawUrl => {
          const nextId =
            SpreadsheetUtils.parseGoogleSpreadsheetInput(String(rawUrl ?? ''))?.spreadsheetId ?? '';
          if (nextId && nextId !== lastSpreadsheetId) {
            lastSpreadsheetId = nextId;
            this.availableSheets = [];
            if (this.settings.value.sheetName) {
              this.settings.patchValue({sheetName: ''}, {emitEvent: false});
            }
          }
        }),
    );

    this.subscriptions.push(
      this.settings.valueChanges.pipe(
        map(value => `${value.speechLang}|${value.speechQuality}`),
        distinctUntilChanged(),
      ).subscribe(() => void this.refreshSpeechAvailability())
    );

    await this.refreshSpeechAvailability();
  }

  override ngOnDestroy() {
    this.stop();
    this.stopSheetLoadTimer();
    this.revokeAllocatedBlobUrls();
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
    }
    super.ngOnDestroy();
  }

  setSubtab(tab: EvalsSubtab) {
    this.activeSubtab = tab;
    if (
      isPlatformBrowser(this.platformId) &&
      !this.document.location.hostname.includes('zipline.googleplex.com')
    ) {
      const targetRoute = tab === 'spreadsheet' ? '/evals/spreadsheet-upload' : '/evals';
      void this.router.navigate([targetRoute], {
        queryParams: {tab: null},
        queryParamsHandling: 'merge',
      });
    }
  }

  usePresetSpreadsheet(preset: 'test' | 'template') {
    this.sheetLoadError = null;
    this.sheetLoadSuccess = null;
    this.availableSheets = [];
    if (preset === 'test') {
      this.settings.patchValue({
        spreadsheetUrl: EvalsPage.DEFAULT_TEST_SPREADSHEET_URL,
        sheetName: '',
      });
    } else {
      this.settings.patchValue({
        spreadsheetUrl: EvalsPage.TEMPLATE_SPREADSHEET_URL,
        sheetName: '',
      });
    }
  }

  selectAvailableSheet(sheet: string) {
    this.settings.patchValue({sheetName: sheet});
    void this.loadFromGoogleSheet(false);
  }

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  get settings(): FormGroup {
    return this.form.get('settings') as FormGroup;
  }

  get isRunning(): boolean {
    return this.status === EvalsExecutionEnum.InProgress;
  }

  get speechPills(): ApiStatusPill[] {
    return [{name: 'Web Speech (on-device)', status: this.speechStatus}];
  }

  get usesPrompt(): boolean {
    return this.rows.controls.some(control => control.value.api === ApiEnum.Prompt);
  }

  get usesSummarizer(): boolean {
    return this.rows.controls.some(control => control.value.api === ApiEnum.Summarizer);
  }

  get usesWebSpeech(): boolean {
    return this.rows.controls.some(control => control.value.api === ApiEnum.WebSpeech);
  }

  get usesSchema(): boolean {
    return this.hasColumnData('schema');
  }

  get hasOutputs(): boolean {
    return this.rows.controls.some(control => !!control.value.output);
  }

  get completedRowCount(): number {
    return this.rows.controls.filter(
      control =>
        control.value.status === InferenceStatusEnum.Success ||
        control.value.status === InferenceStatusEnum.Error,
    ).length;
  }

  get successfulRowCount(): number {
    return this.rows.controls.filter(
      control => control.value.status === InferenceStatusEnum.Success && !!control.value.output,
    ).length;
  }

  get incompleteRowCount(): number {
    return Math.max(0, this.rows.length - this.successfulRowCount);
  }

  get canResume(): boolean {
    return !this.isRunning && this.successfulRowCount > 0 && this.successfulRowCount < this.rows.length;
  }

  get supportsLiveFileSave(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      typeof (window as any).showSaveFilePicker === 'function'
    );
  }

  /** A column is shown once something fills it, or once the user asks for it. */
  showColumn(field: string): boolean {
    return this.requestedColumns.has(field) || this.hasColumnData(field);
  }

  hasColumnData(field: string): boolean {
    // The Summarizer column holds three options rather than one value, and it belongs to the
    // rows that summarise — so it stays on show for as long as one of them does.
    if (field === 'summarizer') {
      return this.usesSummarizer
        || this.summarizerOptions.some(option => this.hasColumnData(option.field));
    }

    return this.rows.controls.some(control => {
      const value = control.value[field];
      return Array.isArray(value) ? value.length > 0 : !!String(value ?? '').trim();
    });
  }

  /** API, Context, Input, Status, Act plus whichever optional columns are on show. */
  get columnCount(): number {
    return 5 + this.optionalColumns.filter(column => this.showColumn(column.field)).length;
  }

  toggleColumn(field: string) {
    if (this.requestedColumns.has(field)) {
      this.requestedColumns.delete(field);
    } else {
      this.requestedColumns.add(field);
    }
  }

  /** Whether a row's API reads this cell at all — everything else is dimmed out. */
  usesField(api: string, field: string): boolean {
    return (EvalsPage.apiFields[api] ?? EvalsPage.apiFields[ApiEnum.Prompt]).includes(field);
  }

  createRow(data?: Partial<EvalsRow>): FormGroup {
    return this.fb.group({
      api: [data?.api || ApiEnum.Prompt],
      context: [data?.context || ''],
      input: [data?.input || ''],
      images: [data?.images || []],
      audio: [data?.audio || []],
      schema: [data?.schema || ''],
      samplingMode: [data?.samplingMode || ''],
      summarizerLength: [data?.summarizerLength || ''],
      summarizerType: [data?.summarizerType || ''],
      summarizerPreference: [data?.summarizerPreference || ''],
      status: [InferenceStatusEnum.Idle],
      output: [''],
      warnings: [data?.warnings || []],
    });
  }

  // ====================================================
  // RUNNING
  // ====================================================

  async run(resumeOnly: boolean = false) {
    if (this.isRunning) {
      return;
    }

    this.abortController = new AbortController();
    this.status = EvalsExecutionEnum.InProgress;
    this.statusMessage = undefined;

    if (this.usesWebSpeech) {
      await this.refreshSpeechAvailability();
    }

    for (let i = 0; i < this.rows.length; i++) {
      if (this.abortController.signal.aborted) {
        break;
      }

      const formRow = this.rows.at(i) as FormGroup;

      if (
        resumeOnly &&
        formRow.value.status === InferenceStatusEnum.Success &&
        String(formRow.value.output ?? '').trim().length > 0
      ) {
        continue;
      }

      formRow.patchValue({status: InferenceStatusEnum.InProgress, output: '', warnings: []});
      this.cdr.detectChanges();

      let lastRenderTime = 0;
      const setOutput = (text: string) => {
        formRow.patchValue({output: text}, {emitEvent: false});
        const now = Date.now();
        if (now - lastRenderTime >= 100) {
          lastRenderTime = now;
          this.cdr.detectChanges();
        }
      };

      try {
        switch (formRow.value.api) {
          case ApiEnum.Summarizer:
            await this.runSummarizer(formRow, setOutput);
            break;

          case ApiEnum.WebSpeech:
            await this.runWebSpeech(formRow, setOutput);
            break;

          default:
            await this.runPrompt(formRow, setOutput);
            break;
        }
        formRow.patchValue({status: InferenceStatusEnum.Success});
      } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : String(e);
        this.addWarning(formRow, message);
        formRow.patchValue({
          status: InferenceStatusEnum.Error,
          output: formRow.value.output || message,
        });
      }
      this.cdr.detectChanges();

      // 1. Save crash-recovery checkpoint to localStorage after every completed row
      this.saveRowCheckpoint(i);

      // 2. If a live local output spreadsheet file (.csv/.tsv) is connected, flush immediately to disk
      if (this.liveOutputFileHandle) {
        await this.flushLiveOutputFile();
      }

      // 3. Yield to the browser event loop & GC between rows so large 500-row datasets do not freeze the tab
      await new Promise<void>(resolve => setTimeout(resolve, 16));
    }

    this.finishRun();
    this.cdr.detectChanges();
  }

  stop() {
    this.abortController?.abort();
    this.activeTranscription?.abort();
  }

  private finishRun() {
    const cancelled = this.abortController?.signal.aborted ?? false;
    this.abortController = null;
    this.activeTranscription = null;

    const total = this.rows.length;
    const failed = this.rows.controls.filter(c => c.value.status === InferenceStatusEnum.Error).length;

    if (cancelled) {
      this.status = EvalsExecutionEnum.Error;
      this.statusMessage = 'Run stopped.';
      return;
    }

    if (failed === 0) {
      this.status = EvalsExecutionEnum.Success;
      this.statusMessage = `${total} row${total === 1 ? '' : 's'} completed.`;
      return;
    }

    this.status = EvalsExecutionEnum.Error;
    this.statusMessage = failed === total
      ? 'Every row failed.'
      : `${failed} of ${total} rows failed.`;
  }

  // ====================================================
  // COPYING & EXPORTING OUTPUTS
  // ====================================================

  /**
   * One line per row, in table order, so the text pastes straight back into the sheet as a
   * column that lines up with the inputs. Cells that would break that alignment are quoted
   * the way a spreadsheet exports them.
   */
  buildOutputsClipboardText(): string {
    return this.rows.controls
      .map(control => EvalsPage.toSpreadsheetCell(String(control.value.output ?? '')))
      .join('\n');
  }

  /** Copies every row's output to the clipboard. Resolves to whether the copy succeeded. */
  async copyOutputs(): Promise<boolean> {
    let copied = false;
    try {
      await navigator.clipboard.writeText(this.buildOutputsClipboardText());
      copied = true;
    } catch (error) {
      console.error('Could not copy the outputs to the clipboard.', error);
    }

    this.showCopyFeedback(copied ? 'copied' : 'failed');
    return copied;
  }

  private showCopyFeedback(feedback: 'copied' | 'failed') {
    this.copyFeedback = feedback;
    if (this.copyFeedbackTimer) {
      clearTimeout(this.copyFeedbackTimer);
    }
    this.copyFeedbackTimer = setTimeout(() => this.copyFeedback = null, 2500);
  }

  /** Quotes a cell when it holds a tab, a line break or a quote, as TSV requires. */
  static toSpreadsheetCell(value: string): string {
    if (!/[\t\r\n"]/.test(value)) {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Builds a 2D table of headers + rows including the generated Output column for CSV / TSV export.
   */
  buildExportTableRows(): string[][] {
    const headers = [
      'Context',
      'Input (Text)',
      'Input (Images)',
      'Input (Audio)',
      'Schema',
      'Sampling Mode',
      'API',
      'Summarizer Length (Optional)',
      'Summarizer Type (Optional)',
      'Summarizer Speed Preference',
      'Status',
      'Output',
    ];

    const formatMediaCell = (items: string[] | undefined): string => {
      if (!items?.length) {
        return '';
      }
      return items
        .map(item =>
          MediaSourceUtils.isBlobUrl(item) ||
          (MediaSourceUtils.isDataUrl(item) && item.length > 2048)
            ? '[embedded media]'
            : item,
        )
        .join(', ');
    };

    const dataRows = this.rows.controls.map(control => {
      const v = control.value;
      return [
        String(v.context ?? ''),
        String(v.input ?? ''),
        formatMediaCell(v.images),
        formatMediaCell(v.audio),
        String(v.schema ?? ''),
        String(v.samplingMode ?? ''),
        String(v.api ?? ApiEnum.Prompt),
        String(v.summarizerLength ?? ''),
        String(v.summarizerType ?? ''),
        String(v.summarizerPreference ?? ''),
        String(v.status ?? ''),
        String(v.output ?? ''),
      ];
    });

    return [headers, ...dataRows];
  }

  buildExportCsv(): string {
    return SpreadsheetUtils.formatDelimitedText(this.buildExportTableRows(), ',');
  }

  buildExportTsv(): string {
    return SpreadsheetUtils.formatDelimitedText(this.buildExportTableRows(), '\t');
  }

  /** Formats a local timestamp (`YYYY-MM-DD_HH-mm-ss`) for versioned result CSV/TSV filenames. */
  static formatResultTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
  }

  /** Builds a timestamped result filename (e.g. `Sheet1-results-2026-11-02_10-00-05.csv`). */
  buildResultFilename(format: 'csv' | 'tsv', date: Date = new Date()): string {
    const safeSheet = (this.loadedSheetName || this.settings.value.sheetName || 'evals')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'evals';
    const timestamp = EvalsPage.formatResultTimestamp(date);
    return `${safeSheet}-results-${timestamp}.${format}`;
  }

  exportResponses(format: 'csv' | 'tsv'): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const content = format === 'csv' ? this.buildExportCsv() : this.buildExportTsv();
    const mimeType =
      format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/tab-separated-values;charset=utf-8;';
    const blob = new Blob([content], {type: mimeType});
    const url = URL.createObjectURL(blob);

    const link = this.document.createElement('a');
    link.href = url;
    link.download = this.buildResultFilename(format);
    this.document.body.appendChild(link);
    link.click();
    this.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ====================================================
  // LIVE LOCAL CSV AUTO-SAVE & CRASH RECOVERY
  // ====================================================

  /**
   * Connects a local `.csv` or `.tsv` file using Chrome's File System Access API (`showSaveFilePicker`)
   * with a timestamped filename (`<sheet>-results-YYYY-MM-DD_HH-mm-ss.csv`) so every completed row
   * is flushed straight to disk during the run — even if the PC freezes later, the file on disk
   * already contains every completed row.
   */
  async connectLiveOutputFile(): Promise<void> {
    if (!this.supportsLiveFileSave) {
      return;
    }

    const suggestedName = this.buildResultFilename('csv');

    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'CSV Spreadsheet (.csv)',
            accept: {'text/csv': ['.csv']},
          },
          {
            description: 'TSV Spreadsheet (.tsv)',
            accept: {'text/tab-separated-values': ['.tsv']},
          },
        ],
      });
      this.liveOutputFileHandle = handle;
      this.liveOutputFileName = String(handle.name || suggestedName);
      await this.flushLiveOutputFile();
      this.cdr.detectChanges();
    } catch {}
  }

  disconnectLiveOutputFile(): void {
    this.liveOutputFileHandle = null;
    this.liveOutputFileName = '';
    this.liveOutputLastSavedAt = '';
    this.cdr.detectChanges();
  }

  private async flushLiveOutputFile(): Promise<void> {
    if (!this.liveOutputFileHandle) {
      return;
    }
    try {
      const isTsv = this.liveOutputFileName.toLowerCase().endsWith('.tsv');
      const content = isTsv ? this.buildExportTsv() : this.buildExportCsv();
      const writable = await this.liveOutputFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      this.liveOutputLastSavedAt = new Date().toLocaleTimeString();
      this.cdr.detectChanges();
    } catch (err) {
      console.warn('Could not flush to live output file:', err);
    }
  }

  private getCurrentCheckpointStorageKey(): string {
    const rawUrl = String(this.settings.value.spreadsheetUrl ?? '').trim();
    const parsed = SpreadsheetUtils.parseGoogleSpreadsheetInput(
      rawUrl,
      String(this.settings.value.sheetName ?? '').trim(),
    );
    const idPart = parsed?.spreadsheetId || this.loadedSheetName || 'manual';
    const tabPart = this.loadedSheetName || parsed?.sheetName || parsed?.gid || 'default';
    return `webai_evals_cp_${idPart}_${tabPart}_${this.rows.length}`;
  }

  private saveRowCheckpoint(rowIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const key = this.getCurrentCheckpointStorageKey();
      const existingRaw = window.localStorage.getItem(key);
      const parsed = existingRaw ? JSON.parse(existingRaw) : {entries: {}};
      const entries: Record<string, {status: string; output: string}> = parsed.entries || {};
      const rowVal = this.rows.at(rowIndex)?.value;
      if (rowVal) {
        entries[String(rowIndex)] = {
          status: String(rowVal.status ?? ''),
          output: String(rowVal.output ?? ''),
        };
      }
      const completedCount = Object.values(entries).filter(
        e => e.status === InferenceStatusEnum.Success && !!e.output,
      ).length;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          key,
          completedCount,
          totalRows: this.rows.length,
          updatedAt: new Date().toLocaleTimeString(),
          entries,
        }),
      );
    } catch {}
  }

  checkForSavedCheckpoint(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const key = this.getCurrentCheckpointStorageKey();
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        this.recoveredCheckpoint = null;
        return;
      }
      const data = JSON.parse(raw);
      if (data && data.completedCount > 0 && data.entries) {
        this.recoveredCheckpoint = data;
      } else {
        this.recoveredCheckpoint = null;
      }
    } catch {
      this.recoveredCheckpoint = null;
    }
  }

  restoreSavedCheckpoint(): void {
    if (!this.recoveredCheckpoint?.entries) {
      return;
    }
    const entries = this.recoveredCheckpoint.entries;
    for (const [idxStr, state] of Object.entries(entries)) {
      const idx = Number(idxStr);
      if (!Number.isNaN(idx) && idx >= 0 && idx < this.rows.length) {
        this.rows.at(idx).patchValue(
          {
            status: state.status || InferenceStatusEnum.Success,
            output: state.output || '',
          },
          {emitEvent: false},
        );
      }
    }
    this.rows.updateValueAndValidity({emitEvent: true});
    this.status = EvalsExecutionEnum.Success;
    this.statusMessage = `Restored ${this.recoveredCheckpoint.completedCount} saved row outputs from checkpoint.`;
    this.recoveredCheckpoint = null;
    this.cdr.detectChanges();
  }

  downloadCheckpointCsv(): void {
    this.restoreSavedCheckpoint();
    this.exportResponses('csv');
  }

  discardSavedCheckpoint(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const key = this.recoveredCheckpoint?.key || this.getCurrentCheckpointStorageKey();
      window.localStorage.removeItem(key);
    } catch {}
    this.recoveredCheckpoint = null;
    this.cdr.detectChanges();
  }

  private async runSummarizer(formRow: FormGroup, setOutput: (text: string) => void): Promise<void> {
    const {context, input, images, audio, schema, samplingMode} = formRow.value;

    if (images?.length || audio?.length) {
      this.addWarning(formRow, 'The Summarizer API reads text only — the attached media was ignored.');
    }

    if (schema?.trim()) {
      this.addWarning(formRow, 'The Summarizer API has no structured output — the schema was ignored.');
    }

    if (samplingMode?.trim()) {
      this.addWarning(formRow, 'The Sampling mode option applies to Prompt rows only — it was ignored.');
    }

    const createOptions = this.buildSummarizerOptions(formRow.value);

    if (await Summarizer.availability(createOptions as any) === 'unavailable') {
      throw new Error('The Summarizer API is unavailable with these options on this device.');
    }

    const signal = this.abortController?.signal;
    const session = await Summarizer.create({...createOptions, signal} as any);

    try {
      let fullResponse = '';

      for await (const chunk of session.summarizeStreaming(input, {context, signal} as any)) {
        fullResponse += chunk;
        setOutput(fullResponse);
      }
    } finally {
      try { session.destroy(); } catch {}
    }
  }

  /**
   * The create options a row asks for. A blank dropdown is left out so the model keeps its own
   * default, and so is a preference of 'auto' — that is the default, so sending it says nothing.
   *
   * A preference of 'speed' runs the small model, which writes English only and refuses a request
   * that does not say so. The row has no language column, so the output language is set here.
   */
  buildSummarizerOptions(row: Partial<EvalsRow>): Record<string, string> {
    const options: Record<string, string> = {};

    for (const {field, option} of this.summarizerOptions) {
      const value = row[field];

      if (value && !(option === 'preference' && value === 'auto')) {
        options[option] = value;
      }
    }

    if (options['preference'] === 'speed') {
      options['outputLanguage'] = 'en';
    }

    return options;
  }

  /** Whether a row carries a Summarizer option, which only Summarizer rows can use. */
  private hasSummarizerOptions(row: Partial<EvalsRow>): boolean {
    return this.summarizerOptions.some(option => !!row[option.field]);
  }

  private async runPrompt(formRow: FormGroup, setOutput: (text: string) => void): Promise<void> {
    const {context, input, images, audio, schema, samplingMode} = formRow.value;

    if (this.hasSummarizerOptions(formRow.value)) {
      this.addWarning(formRow, 'The Summarizer options apply to Summarizer rows only — they were ignored.');
    }

    const expectedInputs = this.buildExpectedInputs(images, audio);
    const responseConstraint = this.buildResponseConstraint(schema);
    const effectiveSamplingMode = (samplingMode || this.settings.value.samplingMode || '').trim();
    const signal = this.abortController?.signal;

    const availabilityOptions: any = {expectedInputs};
    if (effectiveSamplingMode) {
      availabilityOptions.samplingMode = effectiveSamplingMode;
    }

    if (await LanguageModel.availability(availabilityOptions) === 'unavailable') {
      throw new Error(`The Prompt API is unavailable for ${this.describeInputs(images, audio)} on this device.`);
    }

    const sessionCreationOptions: any = {expectedInputs, signal};

    if (effectiveSamplingMode) {
      sessionCreationOptions.samplingMode = effectiveSamplingMode;
    }

    if (context) {
      sessionCreationOptions.initialPrompts = [{role: 'system', content: context}];
    }

    const session = await LanguageModel.create(sessionCreationOptions);
    const bitmaps: ImageBitmap[] = [];

    try {
      const promptInput = await this.buildPromptInput(input, images, audio, bitmaps);
      const promptOptions: any = {signal};

      if (responseConstraint !== null) {
        promptOptions.responseConstraint = responseConstraint;

        if (this.settings.value.omitResponseConstraintInput) {
          promptOptions.omitResponseConstraintInput = true;
        }

        // A constrained answer is only useful once it is whole and parseable, so it is not streamed.
        setOutput(this.prettyPrintJson(await session.prompt(promptInput, promptOptions)));
        return;
      }

      let fullResponse = '';

      for await (const chunk of session.promptStreaming(promptInput, promptOptions)) {
        fullResponse += chunk;
        setOutput(fullResponse);
      }
    } finally {
      for (const bitmap of bitmaps) {
        try { bitmap.close(); } catch {}
      }
      try { session.destroy(); } catch {}
    }
  }

  private async runWebSpeech(formRow: FormGroup, setOutput: (text: string) => void): Promise<void> {
    const {audio, images, schema, samplingMode} = formRow.value;

    if (images?.length) {
      this.addWarning(formRow, 'Web Speech transcribes audio only — the attached images were ignored.');
    }

    if (schema?.trim()) {
      this.addWarning(formRow, 'Web Speech has no structured output — the schema was ignored.');
    }

    if (samplingMode?.trim()) {
      this.addWarning(formRow, 'The Sampling mode option applies to Prompt rows only — it was ignored.');
    }

    if (this.hasSummarizerOptions(formRow.value)) {
      this.addWarning(formRow, 'The Summarizer options apply to Summarizer rows only — they were ignored.');
    }

    if (!audio?.length) {
      throw new Error('Web Speech rows need at least one audio file or path in the Audio column.');
    }

    const {speechLang, speechQuality} = this.settings.value;
    const transcripts: string[] = [];

    for (const source of audio as string[]) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Transcription was cancelled.');
      }

      const preceding = transcripts.length ? `${transcripts.join('\n\n')}\n\n` : '';

      const attempt = this.webSpeech.transcribe(
        source,
        {lang: speechLang, quality: speechQuality as SpeechQuality},
        text => setOutput(preceding + text),
      );

      this.activeTranscription = attempt;

      try {
        transcripts.push(await attempt.result);
      } finally {
        this.activeTranscription = null;
      }

      setOutput(transcripts.join('\n\n'));
    }
  }

  // ====================================================
  // PROMPT INPUT
  // ====================================================

  /**
   * Text is always declared, and every type carries a language tag — a text-less
   * expectedInputs is rejected by the model even when the row only sends an image.
   */
  buildExpectedInputs(images: string[], audio: string[]): any[] {
    const expectedInputs: any[] = [{type: 'text', languages: ['en']}];

    if (images?.length) {
      expectedInputs.push({type: 'image', languages: ['en']});
    }

    if (audio?.length) {
      expectedInputs.push({type: 'audio', languages: ['en']});
    }

    return expectedInputs;
  }

  private async buildPromptInput(
    input: string,
    images: string[],
    audio: string[],
    bitmaps: ImageBitmap[],
  ): Promise<any> {
    if (!images?.length && !audio?.length) {
      return input;
    }

    const content: any[] = [];

    if (input?.trim()) {
      content.push({type: 'text', value: input});
    }

    for (const source of images ?? []) {
      const bitmap = await createImageBitmap(await MediaSourceUtils.fetchBlob(source));
      bitmaps.push(bitmap);
      content.push({type: 'image', value: bitmap});
    }

    for (const source of audio ?? []) {
      content.push({type: 'audio', value: await MediaSourceUtils.fetchBlob(source)});
    }

    return [{role: 'user', content}];
  }

  /**
   * A schema cell holds either a JSON Schema document or a /regex/flags literal. A cell that is
   * neither fails the row: silently running unconstrained would produce a wrong eval result.
   */
  buildResponseConstraint(schema: string): object | RegExp | null {
    const value = (schema ?? '').trim();

    if (!value) {
      return null;
    }

    if (value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new Error(`The schema is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const literal = value.match(/^\/(.*)\/([a-z]*)$/s);

    if (literal) {
      try {
        return new RegExp(literal[1], literal[2]);
      } catch (e) {
        throw new Error(`The schema is not a valid regular expression: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    throw new Error('The schema must be a JSON Schema object ({ ... }) or a /regex/flags literal.');
  }

  private prettyPrintJson(value: string): string {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private describeInputs(images: string[], audio: string[]): string {
    const parts = ['text'];

    if (images?.length) {
      parts.push('image');
    }

    if (audio?.length) {
      parts.push('audio');
    }

    return parts.join(' + ');
  }

  // ====================================================
  // WEB SPEECH
  // ====================================================

  async refreshSpeechAvailability(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const {speechLang, speechQuality} = this.settings.value;

    this.speechStatus = await this.webSpeech.available({
      lang: speechLang,
      quality: speechQuality as SpeechQuality,
    });

    this.speechHint = this.speechStatus === 'unavailable'
      ? `No on-device model for "${speechLang}" at the ${speechQuality} tier. Web Speech rows will fail; the Prompt API can still read the same clips.`
      : '';
  }

  async installSpeechModel(): Promise<void> {
    this.isInstallingSpeechModel = true;

    try {
      const {speechLang, speechQuality} = this.settings.value;
      await this.webSpeech.install({lang: speechLang, quality: speechQuality as SpeechQuality});
      await this.refreshSpeechAvailability();
    } catch (e) {
      this.speechHint = e instanceof Error ? e.message : String(e);
    } finally {
      this.isInstallingSpeechModel = false;
    }
  }

  // ====================================================
  // ROW MEDIA
  // ====================================================

  public async onFileDropped(event: DragEvent, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();

    await this.addFilesToRow(rowIndex, Array.from(event.dataTransfer?.files ?? []));
  }

  public onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  public async selectImage(event: Event, rowIndex: number) {
    const input = event.target as HTMLInputElement;
    await this.addFilesToRow(rowIndex, Array.from(input.files ?? []));
    input.value = '';
  }

  public async selectAudio(event: Event, rowIndex: number) {
    const input = event.target as HTMLInputElement;
    await this.addFilesToRow(rowIndex, Array.from(input.files ?? []));
    input.value = '';
  }

  /** Files are read one at a time so a multi-file drop keeps the order it was dropped in. */
  private async addFilesToRow(rowIndex: number, files: File[]): Promise<void> {
    const formRow = this.rows.at(rowIndex);

    if (!formRow || !files.length) {
      return;
    }

    const images: string[] = [];
    const audio: string[] = [];

    for (const file of files) {
      const kind = this.mediaKindOf(file.type);

      if (!kind) {
        this.addWarning(formRow, `"${file.name}" is not an image or audio file.`);
        continue;
      }

      if (file.size > EvalsPage.maxMediaBytes) {
        this.addWarning(formRow, `"${file.name}" is larger than 25 MB and was skipped.`);
        continue;
      }

      (kind === 'image' ? images : audio).push(await MediaSourceUtils.blobToDataUrl(file));
    }

    if (images.length) {
      formRow.patchValue({images: [...(formRow.value.images ?? []), ...images]});
    }

    if (audio.length) {
      formRow.patchValue({audio: [...(formRow.value.audio ?? []), ...audio]});
    }
  }

  private mediaKindOf(mimeType: string): MediaKind | null {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType.startsWith('audio/')) {
      return 'audio';
    }

    return null;
  }

  public removeImage(rowIndex: number, imageIndex: number) {
    const formRow = this.rows.at(rowIndex);
    const images = [...(formRow?.value.images ?? [])];

    images.splice(imageIndex, 1);
    formRow?.patchValue({images});
  }

  public removeAudio(rowIndex: number, audioIndex: number) {
    const formRow = this.rows.at(rowIndex);
    const audio = [...(formRow?.value.audio ?? [])];

    audio.splice(audioIndex, 1);
    formRow?.patchValue({audio});
  }

  public previewImage(imageSrc: string) {
    this.previewLoaded = false;
    this.previewImageSrc = imageSrc;
  }

  public closePreview() {
    this.previewImageSrc = null;
    this.previewLoaded = false;
  }

  public removeRow(index: number) {
    this.rows.removeAt(index);

    if (!this.rows.length) {
      this.rows.push(this.createRow());
    }
  }

  public addRow() {
    this.rows.push(this.createRow());
  }

  public dismissWarnings(rowIndex: number) {
    this.rows.at(rowIndex)?.patchValue({warnings: []});
  }

  private addWarning(formRow: AbstractControl, message: string) {
    const warnings: string[] = formRow.value.warnings ?? [];

    if (!warnings.includes(message)) {
      formRow.patchValue({warnings: [...warnings, message]});
    }
  }

  // ====================================================
  // BULK ROW CREATION FROM AUDIO
  // ====================================================

  public async onAudioFilesDropped(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer?.files ?? []).filter(file => file.type.startsWith('audio/'));

    if (!files.length) {
      return;
    }

    const sources: string[] = [];

    for (const file of files) {
      sources.push(await MediaSourceUtils.blobToDataUrl(file));
    }

    this.queueAudioSources(sources);
  }

  /** Turns a pasted list of URLs or app-relative paths into one row per clip. */
  public addRowsFromAudioPaths() {
    const paths = String(this.settings.value.audioPaths ?? '')
      .split(/[\n,]/)
      .map(path => path.trim())
      .filter(Boolean);

    if (paths.length) {
      this.queueAudioSources(paths);
    }
  }

  private queueAudioSources(sources: string[]) {
    this.pendingAudioSources = sources;

    const first = this.rows.at(0)?.value;
    const hasData = !!first && (first.context || first.input || first.images.length || first.audio.length);

    if (this.rows.length > 1 || hasData) {
      this.showResetConfirmation = true;
    } else {
      this.applyPendingAudioSources();
    }
  }

  public applyPendingAudioSources() {
    const sources = this.pendingAudioSources;

    this.pendingAudioSources = [];
    this.showResetConfirmation = false;

    this.rows.clear();

    for (const source of sources) {
      this.rows.push(this.createRow({audio: [source]}));
    }

    if (!this.rows.length) {
      this.rows.push(this.createRow());
    }

    this.settings.patchValue({audioPaths: ''});
  }

  public cancelReset() {
    this.pendingAudioSources = [];
    this.showResetConfirmation = false;
  }

  // ====================================================
  // GOOGLE SPREADSHEET & FILE IMPORT
  // ====================================================

  private startSheetLoadProgress(stage: string, detail: string): void {
    this.stopSheetLoadTimer();
    this.isLoadingSheet = true;
    this.isLoadingEmbeddedImages = false;
    this.sheetLoadProgress = 6;
    this.sheetLoadStage = stage;
    this.sheetLoadDetail = detail;
    this.sheetLoadElapsedSeconds = 0;
    this.sheetLoadStartedAt = Date.now();
    this.sheetLoadPhase = 'packaging';
    this.cdr.detectChanges();

    this.sheetLoadTimer = setInterval(() => {
      if (!this.isLoadingSheet) {
        this.stopSheetLoadTimer();
        return;
      }
      const elapsedMs = Date.now() - this.sheetLoadStartedAt;
      this.sheetLoadElapsedSeconds = Math.floor(elapsedMs / 1000);
      if (this.sheetLoadPhase === 'packaging' && this.sheetLoadProgress < 28) {
        this.sheetLoadProgress = Math.min(28, 6 + Math.floor(elapsedMs / 450));
      }
      this.cdr.detectChanges();
    }, 450);
  }

  private updateSheetLoadProgress(progress: number, stage?: string, detail?: string): void {
    this.sheetLoadProgress = Math.max(this.sheetLoadProgress, Math.min(100, Math.round(progress)));
    if (stage !== undefined) {
      this.sheetLoadStage = stage;
    }
    if (detail !== undefined) {
      this.sheetLoadDetail = detail;
    }
    this.cdr.detectChanges();
  }

  private stopSheetLoadTimer(): void {
    if (this.sheetLoadTimer) {
      clearInterval(this.sheetLoadTimer);
      this.sheetLoadTimer = null;
    }
    this.sheetLoadPhase = 'idle';
  }

  private revokeAllocatedBlobUrls(): void {
    if (!this.allocatedBlobUrls.length || typeof URL.revokeObjectURL !== 'function') {
      this.allocatedBlobUrls = [];
      return;
    }
    for (const url of this.allocatedBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.allocatedBlobUrls = [];
  }

  /**
   * When a large spreadsheet with hundreds of embedded cell images takes several seconds for
   * Google Sheets to package as `.xlsx`, this fast CSV preview populates all text rows within ~1.5s
   * and shows a "Loading image..." indicator in the Images column while the `.xlsx` streams.
   */
  private async loadFastCsvPreview(
    spreadsheetId: string,
    sheetName: string,
    gid: string | null,
    isXlsxFinished: () => boolean,
  ): Promise<void> {
    try {
      const csvUrl = SpreadsheetUtils.buildGvizCsvUrl(spreadsheetId, sheetName, gid);
      const response = await fetch(csvUrl, {
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok || isXlsxFinished()) {
        return;
      }
      const contentType = (response.headers?.get?.('content-type') || '').toLowerCase();
      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        return;
      }
      const text = await response.text();
      if (isXlsxFinished()) {
        return;
      }
      const sample = text.slice(0, 256).trim().toLowerCase();
      if (sample.startsWith('<!doctype html') || sample.startsWith('<html')) {
        return;
      }
      const rows = SpreadsheetUtils.parseDelimitedText(text, ',');
      if (rows.length < 2 || isXlsxFinished()) {
        return;
      }
      const bindings = this.readSpreadsheetHeaderBindings(rows[0]);
      const imageBinding = bindings.find(b => b.field === 'images');
      const hasEmbeddedImagesToWaitFor =
        !!imageBinding &&
        rows.slice(1).every(r => !String(r[imageBinding.index] ?? '').trim());

      const previewCount = await this.importTabularRows(rows, true);
      if (previewCount > 0 && !isXlsxFinished()) {
        if (hasEmbeddedImagesToWaitFor) {
          this.isLoadingEmbeddedImages = true;
          if (this.sheetLoadPhase === 'packaging') {
            this.updateSheetLoadProgress(
              Math.max(this.sheetLoadProgress, 18),
              `Loaded ${previewCount} text rows — packaging embedded cell images...`,
              'Google Sheets is packaging embedded cell images into the workbook export. Large sheets with hundreds of images take ~15–25s.',
            );
          }
        }
      }
    } catch {}
  }

  /**
   * Loads the dataset from the configured Google Spreadsheet URL + Sheet Name,
   * populates the evaluation rows, and optionally triggers `run()` immediately.
   */
  public async loadFromGoogleSheet(autoRun: boolean = false): Promise<boolean> {
    if (this.isLoadingSheet || this.isRunning) {
      return false;
    }

    this.sheetLoadError = null;
    this.sheetLoadSuccess = null;

    const rawUrl = String(this.settings.value.spreadsheetUrl ?? '').trim();
    const rawSheetName = String(this.settings.value.sheetName ?? '').trim();

    const parsed = SpreadsheetUtils.parseGoogleSpreadsheetInput(rawUrl, rawSheetName);
    if (!parsed) {
      this.sheetLoadError =
        'Please enter a valid Google Spreadsheet URL (https://docs.google.com/spreadsheets/d/...) or Spreadsheet ID.';
      return false;
    }

    this.startSheetLoadProgress(
      'Connecting to Google Sheets...',
      'Requesting spreadsheet data and checking for embedded cell images...',
    );

    let xlsxFinished = false;
    const previewTimer = setTimeout(() => {
      if (!xlsxFinished && this.isLoadingSheet) {
        void this.loadFastCsvPreview(
          parsed.spreadsheetId,
          parsed.sheetName,
          parsed.gid,
          () => xlsxFinished,
        );
      }
    }, 1200);

    try {
      const loaded = await this.fetchSpreadsheetRows(
        parsed.spreadsheetId,
        parsed.sheetName,
        parsed.gid,
        () => {
          xlsxFinished = true;
        },
      );
      xlsxFinished = true;
      clearTimeout(previewTimer);

      this.availableSheets = loaded.sheets;
      this.loadedSheetName = loaded.resolvedSheet;

      this.updateSheetLoadProgress(
        96,
        'Populating evaluation table...',
        `Rendering rows from "${loaded.resolvedSheet}"...`,
      );

      const importedCount = await this.importTabularRows(loaded.rows, true);
      this.isLoadingEmbeddedImages = false;

      if (importedCount === 0) {
        this.sheetLoadError = `No evaluation rows were found in sheet "${loaded.resolvedSheet}".`;
        this.isLoadingSheet = false;
        this.stopSheetLoadTimer();
        this.cdr.detectChanges();
        return false;
      }

      const rowsWithImages = this.rows.controls.filter(
        control => (control.value.images?.length ?? 0) > 0,
      ).length;
      const imageSummary =
        rowsWithImages > 0
          ? ` (${rowsWithImages} with embedded image${rowsWithImages === 1 ? '' : 's'})`
          : '';

      this.sheetLoadProgress = 100;
      this.sheetLoadSuccess = `Loaded ${importedCount} evaluation row${importedCount === 1 ? '' : 's'}${imageSummary} from "${loaded.resolvedSheet}".`;
      this.lastLoadedSheetKey = `${rawUrl}|${rawSheetName}`;
      this.checkForSavedCheckpoint();
      this.isLoadingSheet = false;
      this.stopSheetLoadTimer();
      this.cdr.detectChanges();

      if (autoRun) {
        await this.run();
      }

      return true;
    } catch (error) {
      xlsxFinished = true;
      clearTimeout(previewTimer);
      this.isLoadingEmbeddedImages = false;
      this.sheetLoadError =
        error instanceof Error
          ? error.message
          : 'Could not load the Google Spreadsheet. Check the sharing settings and sheet name.';
      return false;
    } finally {
      xlsxFinished = true;
      clearTimeout(previewTimer);
      this.isLoadingSheet = false;
      this.isLoadingEmbeddedImages = false;
      this.stopSheetLoadTimer();
      this.cdr.detectChanges();
    }
  }

  private async fetchSpreadsheetRows(
    spreadsheetId: string,
    sheetName: string,
    gid: string | null,
    onXlsxDataReady?: () => void,
  ): Promise<{sheets: string[]; resolvedSheet: string; rows: string[][]}> {
    let apiErrorMessage: string | null = null;
    // 1. Direct client-side streaming fetch of Google Sheets `.xlsx` export (`Access-Control-Allow-Origin: *`).
    //    This works directly in the browser for link-shared sheets, reflects live Google Sheet edits
    //    immediately, and preserves all embedded cell/drawing images (whereas Google's `gviz/tq?tqx=out:csv`
    //    CSV export strips embedded images).
    try {
      const xlsxUrl = SpreadsheetUtils.buildXlsxExportUrl(spreadsheetId);
      let lastProgressUiUpdate = 0;

      const xlsxResult = await SpreadsheetUtils.fetchArrayBufferWithProgress(
        xlsxUrl,
        {
          credentials: 'omit',
          cache: 'no-store',
          signal: AbortSignal.timeout(180_000),
        },
        (receivedBytes, totalBytes) => {
          this.sheetLoadPhase = 'downloading';
          const now = Date.now();
          if (now - lastProgressUiUpdate < 120) {
            return;
          }
          lastProgressUiUpdate = now;

          const mb = (receivedBytes / (1024 * 1024)).toFixed(1);
          let pct: number;
          let detail: string;
          if (totalBytes && totalBytes > 0) {
            const ratio = Math.min(1, receivedBytes / totalBytes);
            pct = 28 + Math.round(ratio * 50);
            const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
            detail = `${mb} MB / ${totalMb} MB downloaded from Google Sheets...`;
          } else {
            // Asymptotic progress curve from 28% -> 78% when Content-Length is omitted (chunked encoding)
            const curve = 1 - Math.exp(-receivedBytes / (120 * 1024 * 1024));
            pct = 28 + Math.round(curve * 50);
            detail = `${mb} MB downloaded from Google Sheets...`;
          }
          this.updateSheetLoadProgress(
            pct,
            'Downloading workbook & embedded cell images...',
            detail,
          );
        },
      );

      if (xlsxResult.ok && xlsxResult.buffer.byteLength >= 4) {
        const bytes = new Uint8Array(xlsxResult.buffer);
        if (
          bytes[0] === 0x50 &&
          bytes[1] === 0x4b &&
          bytes[2] === 0x03 &&
          bytes[3] === 0x04
        ) {
          onXlsxDataReady?.();
          this.sheetLoadPhase = 'extracting';
          const totalMb = (bytes.byteLength / (1024 * 1024)).toFixed(1);
          this.updateSheetLoadProgress(
            80,
            'Extracting embedded cell images...',
            `Unpacking ${totalMb} MB workbook archive...`,
          );

          this.revokeAllocatedBlobUrls();
          return await SpreadsheetUtils.parseXlsx(xlsxResult.buffer, sheetName, gid, {
            useBlobUrls: true,
            onProgress: (completed, total) => {
              const pct = 80 + Math.round((completed / Math.max(1, total)) * 15);
              this.updateSheetLoadProgress(
                pct,
                'Extracting embedded cell images...',
                `Extracted ${completed} of ${total} workbook & image entries (${totalMb} MB)...`,
              );
            },
          });
        }
      }
    } catch (err) {
      if (err instanceof SpreadsheetSheetNotFoundError) {
        this.availableSheets = err.availableSheets;
        throw err;
      }
    }

    // 2. Fallback: Direct client-side fetch from Google Sheets gviz CSV endpoint
    const csvUrl = SpreadsheetUtils.buildGvizCsvUrl(spreadsheetId, sheetName, gid);
    try {
      const response = await fetch(csvUrl, {
        credentials: 'omit',
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        const text = await response.text();
        const sample = text.slice(0, 256).trim().toLowerCase();
        if (!sample.startsWith('<!doctype html') && !sample.startsWith('<html')) {
          const rows = SpreadsheetUtils.parseDelimitedText(text, ',');
          return {
            sheets: sheetName ? [sheetName] : [],
            resolvedSheet: sheetName || 'Sheet1',
            rows,
          };
        }
      }
    } catch {}

    throw new Error(
      apiErrorMessage ||
        'Could not access this Google Spreadsheet. Ensure its sharing permission is set to "Anyone with the link can view", or upload an exported .xlsx / .csv file below.',
    );
  }

  /**
   * Handles uploading or dropping a local `.xlsx`, `.csv`, or `.tsv` spreadsheet file.
   */
  public async onSpreadsheetFileSelected(event: Event, autoRun: boolean = false): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    await this.importSpreadsheetFile(file, autoRun);
  }

  public async onSpreadsheetFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    await this.importSpreadsheetFile(file, false);
  }

  public async importSpreadsheetFile(file: File, autoRun: boolean = false): Promise<boolean> {
    this.sheetLoadError = null;
    this.sheetLoadSuccess = null;
    const fileMb = (file.size / (1024 * 1024)).toFixed(1);
    this.startSheetLoadProgress(
      `Reading "${file.name}" (${fileMb} MB)...`,
      'Parsing spreadsheet rows and extracting embedded cell images...',
    );

    try {
      const lowerName = file.name.toLowerCase();
      const requestedSheet = String(this.settings.value.sheetName ?? '').trim();
      let rows: string[][] = [];
      let resolvedSheet = file.name;

      if (lowerName.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        this.sheetLoadPhase = 'extracting';
        this.revokeAllocatedBlobUrls();
        const parsed = await SpreadsheetUtils.parseXlsx(buffer, requestedSheet, null, {
          useBlobUrls: true,
          onProgress: (completed, total) => {
            const pct = 25 + Math.round((completed / Math.max(1, total)) * 65);
            this.updateSheetLoadProgress(
              pct,
              `Extracting embedded cell images from "${file.name}"...`,
              `Processed ${completed} of ${total} archive entries (${fileMb} MB)...`,
            );
          },
        });
        this.availableSheets = parsed.sheets;
        resolvedSheet = `${file.name} (${parsed.resolvedSheet})`;
        rows = parsed.rows;
      } else if (lowerName.endsWith('.tsv') || file.type === 'text/tab-separated-values') {
        const text = await file.text();
        rows = SpreadsheetUtils.parseDelimitedText(text, '\t');
      } else if (lowerName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') {
        const text = await file.text();
        rows = SpreadsheetUtils.parseDelimitedText(text, ',');
      } else {
        throw new Error('Unsupported file format. Please upload a .xlsx, .csv, or .tsv spreadsheet.');
      }

      this.updateSheetLoadProgress(95, 'Populating evaluation table...', '');
      const importedCount = await this.importTabularRows(rows, true);
      if (importedCount === 0) {
        this.sheetLoadError = `No evaluation rows were found in "${resolvedSheet}".`;
        return false;
      }

      const rowsWithImages = this.rows.controls.filter(
        control => (control.value.images?.length ?? 0) > 0,
      ).length;
      const imageSummary =
        rowsWithImages > 0
          ? ` (${rowsWithImages} with embedded image${rowsWithImages === 1 ? '' : 's'})`
          : '';

      this.loadedSheetName = resolvedSheet;
      this.sheetLoadProgress = 100;
      this.sheetLoadSuccess = `Loaded ${importedCount} evaluation row${importedCount === 1 ? '' : 's'}${imageSummary} from "${resolvedSheet}".`;
      this.lastLoadedSheetKey = `${String(this.settings.value.spreadsheetUrl ?? '').trim()}|${String(this.settings.value.sheetName ?? '').trim()}`;
      this.checkForSavedCheckpoint();
      this.isLoadingSheet = false;
      this.stopSheetLoadTimer();
      this.cdr.detectChanges();

      if (autoRun) {
        await this.run();
      }
      return true;
    } catch (error) {
      if (error instanceof SpreadsheetSheetNotFoundError) {
        this.availableSheets = error.availableSheets;
      }
      this.sheetLoadError =
        error instanceof Error ? error.message : 'Failed to read the uploaded spreadsheet file.';
      return false;
    } finally {
      this.isLoadingSheet = false;
      this.isLoadingEmbeddedImages = false;
      this.stopSheetLoadTimer();
      this.cdr.detectChanges();
    }
  }

  /**
   * Imports a 2D array of string cells (from Google Sheets API/gviz, XLSX, CSV, or TSV)
   * into the Evals `rows` FormArray.
   * Row 1 (`nonEmptyRows[0]`) is always treated as the column header row, and all rows
   * from Row 2 (`nonEmptyRows.slice(1)`) and onwards are imported as evaluation data rows.
   * Returns the number of imported evaluation rows.
   */
  public async importTabularRows(
    rawRows: string[][],
    replaceExisting: boolean = true,
  ): Promise<number> {
    const nonEmptyRows = (rawRows ?? []).filter(row =>
      Array.isArray(row) && row.some(cell => String(cell ?? '').trim().length > 0),
    );

    if (nonEmptyRows.length < 2) {
      return 0;
    }

    const bindings = this.readSpreadsheetHeaderBindings(nonEmptyRows[0]);
    const candidateRows = nonEmptyRows.slice(1);
    const contentFields = new Set<keyof EvalsRow>(['context', 'input', 'images', 'audio', 'schema']);
    const contentBindings = bindings.filter(({field}) => contentFields.has(field));
    const checkBindings = contentBindings.length ? contentBindings : bindings;
    let bodyRows = candidateRows.filter(row =>
      checkBindings.some(({index}) => String(row[index] ?? '').trim().length > 0),
    );

    if (!bodyRows.length) {
      bodyRows = candidateRows.filter(row =>
        bindings.some(({index}) => String(row[index] ?? '').trim().length > 0),
      );
    }

    if (!bodyRows.length) {
      return 0;
    }

    const parsed: Partial<EvalsRow>[] = [];
    for (const rowCells of bodyRows) {
      parsed.push(await this.readTabularRow(rowCells, bindings));
    }

    if (replaceExisting) {
      this.requestedColumns.clear();
      for (const {field} of bindings) {
        if (
          field === 'images' ||
          field === 'audio' ||
          field === 'schema' ||
          field === 'samplingMode'
        ) {
          this.requestedColumns.add(field);
        } else if (
          field === 'summarizerLength' ||
          field === 'summarizerType' ||
          field === 'summarizerPreference'
        ) {
          this.requestedColumns.add('summarizer');
        }
      }

      while (this.rows.length > parsed.length) {
        this.rows.removeAt(this.rows.length - 1, {emitEvent: false});
      }
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        const fullRow: EvalsRow = {
          api: item.api || ApiEnum.Prompt,
          context: item.context || '',
          input: item.input || '',
          images: item.images || [],
          audio: item.audio || [],
          schema: item.schema || '',
          samplingMode: item.samplingMode || '',
          summarizerLength: item.summarizerLength || '',
          summarizerType: item.summarizerType || '',
          summarizerPreference: item.summarizerPreference || '',
          status: InferenceStatusEnum.Idle,
          output: '',
          warnings: item.warnings || [],
        };
        if (i < this.rows.length) {
          this.rows.at(i).patchValue(fullRow, {emitEvent: false});
        } else {
          this.rows.push(this.createRow(fullRow), {emitEvent: false});
        }
      }
      this.rows.updateValueAndValidity({emitEvent: true});
    } else {
      for (let i = 0; i < parsed.length; i++) {
        if (i < this.rows.length) {
          this.rows.at(i).patchValue(parsed[i], {emitEvent: false});
        } else {
          this.rows.push(this.createRow(parsed[i]), {emitEvent: false});
        }
      }
      this.rows.updateValueAndValidity({emitEvent: true});
    }

    this.cdr.detectChanges();
    return parsed.length;
  }

  /**
   * Maps Row 1 of an imported spreadsheet to `ColumnBinding[]` using the exact
   * Spreadsheet-to-Website column mapping table:
   * - API -> API (`api`)
   * - Context -> CONTEXT (`context`)
   * - Input (Text) -> INPUT (`input`)
   * - Input (Images) -> IMAGES (`images`)
   * - Input (Audio) -> AUDIO (`audio`)
   * - Schema -> SCHEMA (`schema`)
   * - Sampling Mode -> SAMPLING MODE (`samplingMode`)
   * - Summarizer Length (Optional) -> SUMMARIZER dropdown -> LENGTH (`summarizerLength`)
   * - Summarizer Type (Optional) -> SUMMARIZER dropdown -> TYPE (`summarizerType`)
   * - Summarizer Speed Preference -> SUMMARIZER dropdown -> SPEED PREFERENCE (`summarizerPreference`)
   *
   * Any column not matching the mapping table (e.g., extra user columns such as `prompt` or `aaaaahhh`)
   * is ignored regardless of column order.
   */
  private readSpreadsheetHeaderBindings(labels: string[]): ColumnBinding[] {
    const bindings: ColumnBinding[] = [];
    const fields = new Set<string>();

    labels.forEach((rawLabel, index) => {
      const normalized = (rawLabel ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!normalized) {
        return;
      }

      const exactField = EvalsPage.exactSpreadsheetHeaders.get(normalized);
      if (!exactField) {
        return;
      }

      if (!fields.has(exactField)) {
        fields.add(exactField);
        bindings.push({field: exactField, index});
      } else if (exactField === 'images' || exactField === 'audio') {
        bindings.push({field: exactField, index});
      }
    });

    return bindings;
  }

  public async onPaste(event: ClipboardEvent, rowIndex: number): Promise<void> {
    const clipboardData = event.clipboardData;

    const files = Array.from(clipboardData?.items ?? [])
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => !!file);

    // A pasted screenshot never carries a table, so the two branches are exclusive.
    if (files.length) {
      event.preventDefault();
      await this.addFilesToRow(rowIndex, files);
      return;
    }

    const html = clipboardData?.getData('text/html');

    if (!html) {
      return;
    }

    const table = new DOMParser().parseFromString(html, 'text/html').querySelector('table');

    if (!table) {
      return;
    }

    event.preventDefault();
    await this.importSheetTable(table);
  }

  private async importSheetTable(table: HTMLTableElement): Promise<void> {
    const tableRows = Array.from(table.querySelectorAll('tr'));

    if (!tableRows.length) {
      return;
    }

    const header = this.readHeaderBindings(tableRows[0]);
    const bindings = header ?? EvalsPage.positionalColumns.map((field, index) => ({field, index}));
    const bodyRows = header ? tableRows.slice(1) : tableRows;

    const parsed: Partial<EvalsRow>[] = [];

    for (const tableRow of bodyRows) {
      parsed.push(await this.readSheetRow(tableRow, bindings));
    }

    for (let i = 0; i < parsed.length; i++) {
      if (i < this.rows.length) {
        this.rows.at(i).patchValue(parsed[i]);
      } else {
        this.rows.push(this.createRow(parsed[i]));
      }
    }
  }

  /**
   * A first row counts as a header when it names at least two distinct columns and most of its
   * filled cells are headings. Columns it does not name — a Notes column, say — are ignored.
   * Anything else falls back to the positional layout, so sheets pasted without headers still
   * import the way they always did.
   */
  private readHeaderBindings(tableRow: HTMLTableRowElement): ColumnBinding[] | null {
    const labels = Array.from(tableRow.querySelectorAll('td, th')).map(
      cell => (cell.textContent ?? '').trim(),
    );
    return this.readHeaderBindingsFromLabels(labels);
  }

  private readHeaderBindingsFromLabels(labels: string[]): ColumnBinding[] | null {
    const bindings: ColumnBinding[] = [];
    const fields = new Set<string>();
    const boundIndices = new Set<number>();
    let filled = 0;
    let matched = 0;

    // Pass 1: Bind exact canonical spreadsheet column names first so extra columns (like "prompt")
    // never steal a field before "Input (Text)" is visited.
    labels.forEach((rawLabel, index) => {
      const normalized = (rawLabel ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!normalized) {
        return;
      }
      filled++;
      const exactField = EvalsPage.exactSpreadsheetHeaders.get(normalized);
      if (!exactField) {
        return;
      }
      matched++;
      boundIndices.add(index);
      if (!fields.has(exactField)) {
        fields.add(exactField);
        bindings.push({field: exactField, index});
      } else if (exactField === 'images' || exactField === 'audio') {
        bindings.push({field: exactField, index});
      }
    });

    // Pass 2: Fallback vocabulary matching for any remaining unbound fields
    labels.forEach((rawLabel, index) => {
      if (boundIndices.has(index)) {
        return;
      }
      const label = (rawLabel ?? '').trim();
      if (!label) {
        return;
      }

      const field = this.matchColumn(label);
      if (!field) {
        return;
      }

      matched++;

      if (!fields.has(field)) {
        fields.add(field);
        bindings.push({field, index});
      } else if (field === 'images' || field === 'audio') {
        // Allow fallback media columns (e.g. "Input (Images)" followed by "Image link (URL)")
        bindings.push({field, index});
      }
    });

    return fields.size >= 2 && matched >= Math.ceil(filled / 2) ? bindings : null;
  }

  /** Resolves a heading such as "Input (Images)" or "Audio files" to the field it names. */
  matchColumn(label: string): keyof EvalsRow | null {
    const normalized = label.trim().toLowerCase();
    const words = normalized.split(/[^a-z]+/).filter(Boolean);

    if (!words.length || words.some(word => !EvalsPage.headerVocabulary.has(word))) {
      return null;
    }

    for (const [pattern, field] of EvalsPage.headerPatterns) {
      if (pattern.test(normalized)) {
        return field;
      }
    }

    return null;
  }

  private async readTabularRow(
    cells: string[],
    bindings: ColumnBinding[],
  ): Promise<Partial<EvalsRow>> {
    const data: Partial<EvalsRow> = {};
    const warnings: string[] = [];

    for (const {field, index} of bindings) {
      const rawText = String(cells[index] ?? '').trim();
      if (!rawText) {
        continue;
      }

      switch (field) {
        case 'images': {
          if (!data.images?.length) {
            data.images = await this.readTabularMediaCell(rawText, 'image', warnings);
          }
          break;
        }

        case 'audio': {
          if (!data.audio?.length) {
            data.audio = await this.readTabularMediaCell(rawText, 'audio', warnings);
          }
          break;
        }

        case 'api':
          data.api = this.normalizeApi(rawText);
          break;

        case 'samplingMode': {
          const value = this.normalizeSamplingMode(rawText);
          if (value === null) {
            const choices = this.samplingModes.map(mode => mode.value).join(', ');
            warnings.push(
              `The Sampling mode "${rawText}" is not a value the API takes — it was ignored. Use ${choices}.`,
            );
          } else {
            data.samplingMode = value;
          }
          break;
        }

        case 'summarizerLength':
        case 'summarizerType':
        case 'summarizerPreference': {
          const option = this.summarizerOptions.find(candidate => candidate.field === field)!;
          const value = this.normalizeSummarizerValue(option, rawText);

          if (value === null) {
            warnings.push(
              `The Summarizer ${option.label.toLowerCase()} "${rawText}" is not a value the API takes — it was ignored. Use ${option.choices.join(', ')}.`,
            );
          } else {
            data[field] = value;
          }
          break;
        }

        default:
          (data as any)[field] = rawText;
          break;
      }
    }

    data.warnings = warnings;
    return data;
  }

  private async readTabularMediaCell(
    rawText: string,
    kind: MediaKind,
    warnings: string[],
  ): Promise<string[]> {
    let cleaned = rawText.trim();
    const imageFormulaMatch = cleaned.match(/^=?\s*image\(\s*"([^"]+)"/i);
    if (imageFormulaMatch) {
      cleaned = imageFormulaMatch[1].trim();
    }

    if (/^https?:\/\/(?:www\.)?web-ai\.studio\/images\//i.test(cleaned)) {
      cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?web-ai\.studio\/+/i, '');
    }

    if (MediaSourceUtils.isBlobUrl(cleaned)) {
      this.allocatedBlobUrls.push(cleaned);
      return [cleaned];
    }

    if (MediaSourceUtils.isDataUrl(cleaned)) {
      return [cleaned];
    }

    const candidates = cleaned
      .split(/[\s,]+/)
      .map(c => c.trim())
      .filter(
        candidate =>
          MediaSourceUtils.isDataOrBlobUrl(candidate) ||
          MediaSourceUtils.looksLikePath(candidate, kind),
      );

    const sources: string[] = [];
    for (const source of candidates) {
      sources.push(await this.resolveMediaSource(source, kind, warnings, false));
    }
    return sources;
  }

  private async readSheetRow(tableRow: HTMLTableRowElement, bindings: ColumnBinding[]): Promise<Partial<EvalsRow>> {
    const cells = Array.from(tableRow.querySelectorAll('td, th'));
    const data: Partial<EvalsRow> = {};
    const warnings: string[] = [];

    for (const {field, index} of bindings) {
      const cell = cells[index];

      if (!cell) {
        continue;
      }

      switch (field) {
        case 'images': {
          if (!data.images?.length) {
            data.images = await this.readMediaCell(cell, 'image', warnings);
          }
          break;
        }

        case 'audio': {
          if (!data.audio?.length) {
            data.audio = await this.readMediaCell(cell, 'audio', warnings);
          }
          break;
        }

        case 'api':
          data.api = this.normalizeApi(cell.textContent ?? '');
          break;

        case 'samplingMode': {
          const written = (cell.textContent ?? '').trim();
          const value = this.normalizeSamplingMode(written);

          if (value === null) {
            const choices = this.samplingModes.map(mode => mode.value).join(', ');
            warnings.push(`The Sampling mode "${written}" is not a value the API takes — it was ignored. Use ${choices}.`);
          } else {
            data.samplingMode = value;
          }

          break;
        }

        case 'summarizerLength':
        case 'summarizerType':
        case 'summarizerPreference': {
          const option = this.summarizerOptions.find(candidate => candidate.field === field)!;
          const written = (cell.textContent ?? '').trim();
          const value = this.normalizeSummarizerValue(option, written);

          if (value === null) {
            warnings.push(`The Summarizer ${option.label.toLowerCase()} "${written}" is not a value the API takes — it was ignored. Use ${option.choices.join(', ')}.`);
          } else {
            data[field] = value;
          }

          break;
        }

        default:
          (data as any)[field] = (cell.textContent ?? '').trim();
          break;
      }
    }

    data.warnings = warnings;

    return data;
  }

  /**
   * Matches a cell such as "Short", "Key Points" or "TL;DR" to the value the API expects.
   * Returns an empty string for an empty cell, and null for a value the API does not take.
   */
  normalizeSummarizerValue(option: SummarizerOption, written: string): string | null {
    const cleaned = written.trim().toLowerCase();

    if (!cleaned) {
      return '';
    }

    // Letters alone, so "Key Points", "key-points" and "keypoints" all land on the same choice.
    const key = cleaned.replace(/[^a-z]/g, '');

    return option.choices.find(choice => choice.replace(/[^a-z]/g, '') === key) ?? null;
  }

  /**
   * Matches a cell such as "Most Predictable" or "most-predictable" to the LanguageModelSamplingMode value.
   * Returns an empty string for an empty cell, and null for an unrecognized value.
   */
  normalizeSamplingMode(written: string): string | null {
    const cleaned = written.trim().toLowerCase();

    if (!cleaned) {
      return '';
    }

    const key = cleaned.replace(/[^a-z]/g, '');

    return this.samplingModes.find(mode => mode.value.replace(/[^a-z]/g, '') === key)?.value ?? null;
  }

  private async readMediaCell(cell: Element, kind: MediaKind, warnings: string[]): Promise<string[]> {
    // A URL written as text wins over an embedded element, because typing one is a deliberate
    // choice; an embedded <img> is just how a picture in a sheet cell arrives. Both work —
    // Google's image hosts serve those pictures with Access-Control-Allow-Origin: *.
    const written = (cell.textContent ?? '')
      .trim()
      .split(/[\s,]+/)
      .filter(candidate => MediaSourceUtils.looksLikePath(candidate, kind));

    const embedded = Array.from(cell.querySelectorAll('img, audio, source'))
      .map(element => element.getAttribute('src') ?? '')
      .filter(Boolean);

    const found = written.length ? written : embedded;
    const sources: string[] = [];

    for (const source of found) {
      sources.push(await this.resolveMediaSource(source, kind, warnings, true));
    }

    return sources;
  }

  /**
   * Remote media is inlined so the row survives the sheet going away. When CORS refuses, the
   * URL is kept: the preview still renders it and the run fetches it again.
   */
  private async resolveMediaSource(
    source: string,
    kind: MediaKind,
    warnings: string[],
    fromClipboard: boolean = true,
  ): Promise<string> {
    // Normalize https://web-ai.studio/... URLs to local relative paths when running on another host
    source = MediaSourceUtils.normalizeLocalAssetUrl(source);

    if (MediaSourceUtils.isBlobUrl(source)) {
      return source;
    }

    // A data URL is already the bytes the clipboard carried — there is nothing better to fetch,
    // but it is worth saying so when those bytes are only a cell-sized preview.
    if (MediaSourceUtils.isDataUrl(source)) {
      if (kind === 'image') {
        await this.warnIfUnderSized(source, source, warnings, fromClipboard);
      }
      return source;
    }

    if (!MediaSourceUtils.isAbsoluteUrl(source)) {
      return source;
    }

    // A picture in a sheet cell arrives as a downscaled thumbnail, so ask the CDN for the
    // original first and fall back to the URL as written when no variant is served.
    const candidates = kind === 'image'
      ? [...MediaSourceUtils.googleFullSizeVariants(source), source]
      : [source];

    let wrongType = false;

    for (const candidate of candidates) {
      try {
        const blob = await MediaSourceUtils.fetchBlob(candidate);

        if (blob.type.startsWith(`${kind}/`)) {
          if (kind === 'image') {
            await this.warnIfUnderSized(blob, source, warnings, false);
          }

          return await MediaSourceUtils.blobToDataUrl(blob);
        }

        wrongType = true;
      } catch {}
    }

    warnings.push(wrongType
      ? `"${MediaSourceUtils.describe(source)}" is not ${kind === 'image' ? 'an image' : 'an audio'} file.`
      : `"${MediaSourceUtils.describe(source)}" could not be downloaded — check the link is publicly reachable, ` +
        `or drop the file into this row instead.`);

    return source;
  }

  /**
   * The model squares images to 768x768, so anything arriving smaller has already lost detail
   * before it is ever prompted. Saying so is the whole point: the old importer took a cell
   * thumbnail without a word, and the row looked fine.
   */
  private async warnIfUnderSized(
    image: string | Blob,
    source: string,
    warnings: string[],
    fromClipboard: boolean,
  ): Promise<void> {
    const size = await MediaSourceUtils.imageSize(image);

    if (!size || Math.max(size.width, size.height) >= EvalsPage.minUsefulImageEdge) {
      return;
    }

    warnings.push(fromClipboard
      ? `The sheet carried only a ${size.width}x${size.height} preview of this picture, not the original. `
        + `Use =IMAGE("https://...") in the cell so the paste carries a link, or drop the file on this row.`
      : `This picture came back ${size.width}x${size.height} from ${MediaSourceUtils.describe(source)}. `
        + `The model squares images to ${EvalsPage.minUsefulImageEdge}x${EvalsPage.minUsefulImageEdge}, so detail is being lost.`);
  }

  normalizeApi(value: string): ApiEnum {
    return EvalsPage.apiAliases[(value ?? '').trim().toLowerCase()] ?? ApiEnum.Prompt;
  }

  protected readonly InferenceStatusEnum = InferenceStatusEnum;
  protected readonly EvalsExecutionEnum = EvalsExecutionEnum;
  protected readonly ApiEnum = ApiEnum;
}
