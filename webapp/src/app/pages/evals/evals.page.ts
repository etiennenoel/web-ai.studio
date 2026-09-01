import {Component, DOCUMENT, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
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
import {ApiStatusPill} from '../demos/components/api-status/api-status.component';

type MediaKind = 'image' | 'audio';

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
    'image', 'images', 'input', 'output', 'prompt', 'response', 'schema', 'sound',
    'structured', 'system', 'text',
  ]);

  /**
   * Which field a heading names, most specific first — so "Input (Images)" binds to images
   * rather than to input.
   */
  private static readonly headerPatterns: [RegExp, keyof EvalsRow][] = [
    [/image/, 'images'],
    [/audio|sound|clip/, 'audio'],
    [/schema|constraint|structured/, 'schema'],
    [/api/, 'api'],
    [/context|system/, 'context'],
    [/input|prompt|text/, 'input'],
  ];

  /** The layout a sheet without a header row is assumed to use — unchanged from before. */
  private static readonly positionalColumns: (keyof EvalsRow)[] = ['context', 'input', 'images', 'api'];

  /** Which cells each API actually reads. Everything else is dimmed out on that row. */
  private static readonly apiFields: Record<string, readonly string[]> = {
    [ApiEnum.Prompt]: ['context', 'input', 'images', 'audio', 'schema'],
    [ApiEnum.Summarizer]: ['context', 'input'],
    [ApiEnum.WebSpeech]: ['audio'],
  };

  form: FormGroup;

  statusMessage?: string;

  status = EvalsExecutionEnum.Idle;

  previewImageSrc: string | null = null;

  showResetConfirmation: boolean = false;

  showAudioImport: boolean = false;

  pendingAudioSources: string[] = [];

  speechStatus: string = 'loading...';

  speechHint: string = '';

  isInstallingSpeechModel: boolean = false;

  readonly apiOptions: ApiEnum[] = Object.values(ApiEnum);

  readonly optionalColumns: {field: 'images' | 'audio' | 'schema', label: string, icon: string}[] = [
    {field: 'images', label: 'Images', icon: 'bi-image'},
    {field: 'audio', label: 'Audio', icon: 'bi-file-earmark-music'},
    {field: 'schema', label: 'Schema', icon: 'bi-braces'},
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
    router: Router,
    route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
    private readonly webSpeech: WebSpeechService,
  ) {
    super(document, title)

    this.setTitle("Evals")
    this.form = this.fb.group({
      settings: this.fb.group({
        speechLang: ['en-US'],
        speechQuality: ['dictation'],
        omitResponseConstraintInput: [false],
        audioPaths: [''],
      }),
      rows: this.fb.array([this.createRow()])
    });
  }

  override async ngOnInit() {
    super.ngOnInit();

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

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
    super.ngOnDestroy();
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

  get usesWebSpeech(): boolean {
    return this.rows.controls.some(control => control.value.api === ApiEnum.WebSpeech);
  }

  get usesSchema(): boolean {
    return this.hasColumnData('schema');
  }

  /** A column is shown once something fills it, or once the user asks for it. */
  showColumn(field: string): boolean {
    return this.requestedColumns.has(field) || this.hasColumnData(field);
  }

  hasColumnData(field: string): boolean {
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
      status: [InferenceStatusEnum.Idle],
      output: [''],
      warnings: [data?.warnings || []],
    });
  }

  // ====================================================
  // RUNNING
  // ====================================================

  async run() {
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

      formRow.patchValue({status: InferenceStatusEnum.InProgress, output: '', warnings: []});

      const setOutput = (text: string) => formRow.patchValue({output: text});

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
    }

    this.finishRun();
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

  private async runSummarizer(formRow: FormGroup, setOutput: (text: string) => void): Promise<void> {
    const {context, input, images, audio, schema} = formRow.value;

    if (images?.length || audio?.length) {
      this.addWarning(formRow, 'The Summarizer API reads text only — the attached media was ignored.');
    }

    if (schema?.trim()) {
      this.addWarning(formRow, 'The Summarizer API has no structured output — the schema was ignored.');
    }

    if (await Summarizer.availability() === 'unavailable') {
      throw new Error('The Summarizer API is unavailable on this device.');
    }

    const signal = this.abortController?.signal;
    const session = await Summarizer.create({signal} as any);

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

  private async runPrompt(formRow: FormGroup, setOutput: (text: string) => void): Promise<void> {
    const {context, input, images, audio, schema} = formRow.value;

    const expectedInputs = this.buildExpectedInputs(images, audio);
    const responseConstraint = this.buildResponseConstraint(schema);
    const signal = this.abortController?.signal;

    if (await LanguageModel.availability({expectedInputs} as any) === 'unavailable') {
      throw new Error(`The Prompt API is unavailable for ${this.describeInputs(images, audio)} on this device.`);
    }

    const sessionCreationOptions: any = {expectedInputs, signal};

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
    const {audio, images, schema} = formRow.value;

    if (images?.length) {
      this.addWarning(formRow, 'Web Speech transcribes audio only — the attached images were ignored.');
    }

    if (schema?.trim()) {
      this.addWarning(formRow, 'Web Speech has no structured output — the schema was ignored.');
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
    this.previewImageSrc = imageSrc;
  }

  public closePreview() {
    this.previewImageSrc = null;
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
  // SPREADSHEET IMPORT
  // ====================================================

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
    const cells = Array.from(tableRow.querySelectorAll('td, th'));
    const bindings: ColumnBinding[] = [];
    const fields = new Set<string>();
    let filled = 0;
    let matched = 0;

    cells.forEach((cell, index) => {
      const label = (cell.textContent ?? '').trim();

      if (!label) {
        return;
      }

      filled++;
      const field = this.matchColumn(label);

      if (!field) {
        return;
      }

      matched++;

      if (!fields.has(field)) {
        fields.add(field);
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
        case 'images':
          data.images = await this.readMediaCell(cell, 'image', warnings);
          break;

        case 'audio':
          data.audio = await this.readMediaCell(cell, 'audio', warnings);
          break;

        case 'api':
          data.api = this.normalizeApi(cell.textContent ?? '');
          break;

        default:
          (data as any)[field] = (cell.textContent ?? '').trim();
          break;
      }
    }

    data.warnings = warnings;

    return data;
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
      sources.push(await this.resolveMediaSource(source, kind, warnings));
    }

    return sources;
  }

  /**
   * Remote media is inlined so the row survives the sheet going away. When CORS refuses, the
   * URL is kept: the preview still renders it and the run fetches it again.
   */
  private async resolveMediaSource(source: string, kind: MediaKind, warnings: string[]): Promise<string> {
    if (MediaSourceUtils.isDataUrl(source) || !MediaSourceUtils.isAbsoluteUrl(source)) {
      return source;
    }

    try {
      const blob = await MediaSourceUtils.fetchBlob(source);

      if (!blob.type.startsWith(`${kind}/`)) {
        warnings.push(`"${MediaSourceUtils.describe(source)}" is not ${kind === 'image' ? 'an image' : 'an audio'} file.`);
        return source;
      }

      return await MediaSourceUtils.blobToDataUrl(blob);
    } catch {
      warnings.push(
        `"${MediaSourceUtils.describe(source)}" could not be downloaded — check the link is publicly reachable, ` +
        `or drop the file into this row instead.`
      );
      return source;
    }
  }

  normalizeApi(value: string): ApiEnum {
    return EvalsPage.apiAliases[(value ?? '').trim().toLowerCase()] ?? ApiEnum.Prompt;
  }

  protected readonly InferenceStatusEnum = InferenceStatusEnum;
  protected readonly EvalsExecutionEnum = EvalsExecutionEnum;
  protected readonly ApiEnum = ApiEnum;
}
