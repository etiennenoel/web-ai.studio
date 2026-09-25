import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ClassifierManager,
  ApiCheck,
  ApiStatus,
  ClassifierSchema,
  ClassifierResult,
  ClassifierModelStatus,
  ClassifierModelVariant,
  ClassifierModelState,
  CLASSIFIER_DEMO_PRESETS,
  findClassifierModelVariant,
  ToastService,
} from 'base';

/**
 * Classifier API panel: edit a schema, classify text through the extension's
 * polyfill runtime, and manage the model powering it.
 */
@Component({
  selector: 'app-classifier',
  templateUrl: './classifier.component.html',
  styleUrls: ['./classifier.component.scss'],
  standalone: false,
})
export class ClassifierComponent implements OnInit, OnDestroy {
  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml = '';

  readonly presets = CLASSIFIER_DEMO_PRESETS;
  schemaJson = JSON.stringify(CLASSIFIER_DEMO_PRESETS[0].schema, null, 2);
  schemaError = '';
  inputText = CLASSIFIER_DEMO_PRESETS[0].samples[0];
  callContext = '';

  result: ClassifierResult | null = null;
  rawJson = '';
  error = '';
  busy = false;
  busyLabel = '';
  downloadProgress = 0;
  downloading = false;
  elapsedMs: number | null = null;
  contextWindow: number | null = null;
  contextUsage: number | null = null;
  inputUsage: number | null = null;
  isCodeViewerVisible = false;

  activeVariant: ClassifierModelVariant | undefined;
  activeModelStatus: ClassifierModelStatus | undefined;

  private sessionId: string | null = null;
  private sessionSchemaJson = '';
  private activeRequestId: string | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly classifierManager: ClassifierManager,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.checkApiStatus();
    this.refreshModel();
    this.subscriptions.push(this.classifierManager.modelsChangedEvent.subscribe(() => {
      this.dropSession();
      this.checkApiStatus();
      this.refreshModel();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.dropSession();
  }

  get parsedSchema(): ClassifierSchema | null {
    try {
      const parsed = JSON.parse(this.schemaJson);
      this.schemaError = '';
      return parsed;
    } catch (e: any) {
      this.schemaError = e.message;
      return null;
    }
  }

  get codeSnippet(): string {
    const schema = this.parsedSchema ?? {};
    return this.classifierManager.getCodeSnippet(schema, this.inputText);
  }

  loadPreset(id: string): void {
    const preset = this.presets.find((p) => p.id === id);
    if (!preset) return;
    this.schemaJson = JSON.stringify(preset.schema, null, 2);
    this.inputText = preset.samples[0];
    this.result = null;
    this.rawJson = '';
    this.error = '';
  }

  async checkApiStatus(): Promise<void> {
    try {
      const status = await this.classifierManager.getStatus();
      this.checks = status.checks;
      this.statusText = status.message;
      this.isApiAvailable = status.status === ApiStatus.AVAILABLE || status.status === ApiStatus.DOWNLOADABLE;
      this.isWarning = status.status === ApiStatus.DOWNLOADABLE;
      this.errorHtml = status.errorHtml ?? '';
    } catch (e: any) {
      this.statusText = 'Error Checking Status';
      this.isApiAvailable = false;
      this.isWarning = false;
      this.errorHtml = `<p>${e.message}</p>`;
    } finally {
      this.cdr.detectChanges();
    }
  }

  async refreshModel(): Promise<void> {
    try {
      const { activeVariantId, models } = await this.classifierManager.listModels();
      this.activeVariant = findClassifierModelVariant(activeVariantId);
      this.activeModelStatus = models.find((m) => m.variantId === activeVariantId);
    } catch {
      this.activeVariant = undefined;
      this.activeModelStatus = undefined;
    }
    this.cdr.detectChanges();
  }


  get isModelCached(): boolean {
    return this.activeModelStatus?.state === ClassifierModelState.CACHED;
  }



  async classify(): Promise<void> {
    const schema = this.parsedSchema;
    if (!schema || this.busy || !this.inputText.trim()) return;

    this.busy = true;
    this.error = '';
    this.result = null;
    this.rawJson = '';
    this.elapsedMs = null;
    this.inputUsage = null;
    this.cdr.detectChanges();

    const requestId = crypto.randomUUID();
    this.activeRequestId = requestId;
    try {
      if (!this.sessionId || this.sessionSchemaJson !== this.schemaJson) {
        this.dropSession();
        this.busyLabel = this.isModelCached ? 'Loading model...' : 'Downloading model...';
        this.cdr.detectChanges();
        const info = await this.classifierManager.createSession(
          schema,
          (loaded) => this.ngZone.run(() => this.onProgress(loaded)),
          requestId,
        );
        this.sessionId = info.sessionId;
        this.sessionSchemaJson = this.schemaJson;
        this.contextWindow = info.contextWindow;
        this.contextUsage = info.contextUsage;
        this.downloading = false;
        this.refreshModel();
      }

      this.busyLabel = 'Classifying...';
      this.cdr.detectChanges();
      const options = this.callContext.trim() ? { context: this.callContext } : {};
      this.inputUsage = await this.classifierManager.measureContextUsage(this.sessionId!, this.inputText, options);
      const start = performance.now();
      this.result = await this.classifierManager.classify(this.sessionId!, this.inputText, options, requestId);
      this.elapsedMs = Math.round(performance.now() - start);
      this.rawJson = JSON.stringify(this.result, null, 2);
    } catch (e: any) {
      this.error = `${e.name ?? 'Error'}: ${e.message}`;
      if (e.name === 'InvalidStateError') this.dropSession();
    } finally {
      this.busy = false;
      this.downloading = false;
      this.activeRequestId = null;
      this.cdr.detectChanges();
    }
  }

  cancel(): void {
    if (this.activeRequestId) this.classifierManager.abort(this.activeRequestId);
  }

  toggleCodeViewer(): void {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.codeSnippet).then(() => this.toastService.show('Code copied to clipboard.'));
  }

  copyRaw(): void {
    navigator.clipboard.writeText(this.rawJson).then(() => this.toastService.show('Result copied to clipboard.'));
  }

  private onProgress(loaded: number): void {
    this.downloading = loaded < 1;
    this.downloadProgress = Math.round(loaded * 100);
    this.cdr.detectChanges();
  }

  private dropSession(): void {
    if (this.sessionId) this.classifierManager.destroySession(this.sessionId).catch(() => undefined);
    this.sessionId = null;
    this.sessionSchemaJson = '';
  }
}
