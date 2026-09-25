import { Component, Input, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassifierManager } from '../../managers/classifier.manager';
import { ClassifierDecisionsComponent } from './classifier-decisions.component';
import { CLASSIFIER_DEMO_PRESETS } from './classifier-demo-presets.const';
import { ClassifierDemoPreset } from './classifier-demo-preset.interface';
import { ClassifierResult } from '../types/classifier-result.type';
import { ClassifierAvailability } from '../types/classifier-availability.type';
import { findClassifierModelVariant, classifierModelTotalBytes } from '../registry/classifier-model-registry.utils';

/**
 * Self-contained Classifier API demo for extension pages. Runs through the
 * offscreen runtime, so it works where `window.Classifier` does not exist.
 */
@Component({
  selector: 'lib-classifier-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, ClassifierDecisionsComponent],
  template: `
    <div class="rounded-xl border border-gray-300 dark:border-[#3c4043] bg-gray-50 dark:bg-[#292a2d] overflow-hidden">
      <!-- Status bar -->
      <div class="px-4 py-3 border-b border-gray-300 dark:border-[#3c4043] flex flex-wrap items-center gap-3 bg-white dark:bg-[#202124]">
        <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Classifier API</span>
        <span class="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider" [ngClass]="badgeClass">{{ badgeText }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ modelName }}</span>
        <div *ngIf="downloading" class="flex items-center gap-2 ml-auto text-xs text-blue-600 dark:text-blue-400">
          <div class="w-32 h-2 bg-gray-200 dark:bg-[#3c4043] rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full transition-all" [style.width.%]="downloadProgress"></div>
          </div>
          <span class="font-mono">{{ downloadProgress }}%</span>
        </div>
        <span *ngIf="!downloading && elapsedMs !== null" class="ml-auto text-xs font-mono text-gray-500 dark:text-gray-400">
          {{ elapsedMs }} ms
        </span>
      </div>

      <div class="p-4 space-y-4">
        <!-- Preset picker -->
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let p of presets" (click)="selectPreset(p)"
            class="text-xs px-3 py-1.5 rounded-full border transition-colors"
            [ngClass]="p.id === preset.id
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white dark:bg-[#202124] border-gray-300 dark:border-[#5f6368] text-gray-700 dark:text-gray-300 hover:border-blue-400'">
            {{ p.title }}
          </button>
        </div>
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ preset.description }}</p>

        <!-- Questions summary -->
        <div class="flex flex-wrap gap-2">
          <span *ngFor="let q of preset.schema.questions" class="text-[11px] font-mono px-2 py-1 rounded bg-white dark:bg-[#202124] border border-gray-200 dark:border-[#3c4043] text-gray-700 dark:text-gray-300" [title]="q.prompt">
            <span class="text-pink-600 dark:text-pink-400">{{ q.type }}</span> {{ q.id }}
          </span>
        </div>

        <!-- Input -->
        <div class="space-y-2">
          <textarea [(ngModel)]="input" rows="3"
            class="w-full bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#5f6368] rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none resize-y"
            placeholder="Type any text to classify..."></textarea>
          <div class="flex flex-wrap gap-2 items-center">
            <button *ngFor="let s of preset.samples" (click)="input = s"
              class="text-[11px] px-2 py-1 rounded border border-dashed border-gray-300 dark:border-[#5f6368] text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:border-blue-400 truncate max-w-[16rem]" [title]="s">
              {{ s }}
            </button>
            <button (click)="run()" [disabled]="busy || !input.trim()"
              class="ml-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <i class="fa-solid" [ngClass]="busy ? 'fa-spinner fa-spin' : 'fa-play'"></i>
              {{ busy ? busyLabel : (availability === 'downloadable' ? 'Download model & classify' : 'Classify') }}
            </button>
            <button *ngIf="busy" (click)="cancel()" class="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-[#5f6368] text-gray-700 dark:text-gray-300">Cancel</button>
          </div>
          <p *ngIf="availability === 'downloadable' && !busy" class="text-[11px] text-gray-500 dark:text-gray-400">
            First run downloads {{ modelSize }} from Hugging Face and caches it in the extension. Nothing you type leaves your browser.
          </p>
        </div>

        <!-- Error -->
        <div *ngIf="error" class="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 font-mono whitespace-pre-wrap">{{ error }}</div>

        <!-- Results -->
        <lib-classifier-decisions *ngIf="result" [result]="result" [columns]="columns"></lib-classifier-decisions>

        <!-- Code -->
        <div *ngIf="showCode">
          <button (click)="codeVisible = !codeVisible" class="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-500 flex items-center gap-2">
            <i class="fa-solid fa-chevron-down transition-transform" [class.rotate-180]="codeVisible"></i> Show the code you would write on a web page
          </button>
          <div *ngIf="codeVisible" class="relative mt-2">
            <pre class="bg-gray-900 text-gray-200 rounded-lg p-3 text-[11px] overflow-x-auto"><code>{{ code }}</code></pre>
            <button (click)="copyCode()" class="absolute top-2 right-2 text-gray-400 hover:text-white bg-gray-800 rounded p-1.5" title="Copy"><i class="fa-regular fa-copy"></i></button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ClassifierDemoComponent implements OnInit, OnDestroy {
  @Input() columns: 1 | 2 = 2;
  @Input() showCode = true;

  readonly presets = CLASSIFIER_DEMO_PRESETS;
  preset: ClassifierDemoPreset = CLASSIFIER_DEMO_PRESETS[0];
  input = CLASSIFIER_DEMO_PRESETS[0].samples[0];

  availability: ClassifierAvailability | 'checking' | 'error' = 'checking';
  modelName = '';
  modelSize = '';
  busy = false;
  busyLabel = 'Working...';
  downloading = false;
  downloadProgress = 0;
  elapsedMs: number | null = null;
  error = '';
  result: ClassifierResult | null = null;
  codeVisible = false;

  private sessionId: string | null = null;
  private sessionPresetId: string | null = null;
  private activeRequestId: string | null = null;

  constructor(
    private readonly classifierManager: ClassifierManager,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.refreshStatus();
    this.classifierManager.modelsChangedEvent.subscribe(() => this.refreshStatus());
  }

  ngOnDestroy(): void {
    this.dropSession();
  }

  get code(): string {
    return this.classifierManager.getCodeSnippet(this.preset.schema, this.input);
  }

  get badgeText(): string {
    switch (this.availability) {
      case 'available': return 'Ready';
      case 'downloadable': return 'Downloadable';
      case 'downloading': return 'Downloading';
      case 'unavailable': return 'Unavailable';
      case 'error': return 'Error';
      default: return 'Checking';
    }
  }

  get badgeClass(): string {
    switch (this.availability) {
      case 'available': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'downloadable':
      case 'downloading': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'unavailable':
      case 'error': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  }

  selectPreset(preset: ClassifierDemoPreset): void {
    if (preset.id === this.preset.id) return;
    this.preset = preset;
    this.input = preset.samples[0];
    this.result = null;
    this.error = '';
    this.elapsedMs = null;
  }

  async refreshStatus(): Promise<void> {
    try {
      const variantId = await this.classifierManager.getActiveVariantId();
      const variant = findClassifierModelVariant(variantId);
      this.modelName = variant?.name ?? variantId;
      this.modelSize = variant ? `${Math.round(classifierModelTotalBytes(variant) / 1_000_000)} MB` : '';
      this.availability = await this.classifierManager.availability(this.preset.schema);
    } catch (e: any) {
      this.availability = 'error';
      this.error = e.message;
    }
    this.cdr.detectChanges();
  }

  async run(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.result = null;
    this.elapsedMs = null;
    this.cdr.detectChanges();

    const requestId = crypto.randomUUID();
    this.activeRequestId = requestId;
    try {
      if (!this.sessionId || this.sessionPresetId !== this.preset.id) {
        this.dropSession();
        this.busyLabel = this.availability === 'available' ? 'Loading model...' : 'Downloading...';
        this.cdr.detectChanges();
        const info = await this.classifierManager.createSession(
          this.preset.schema,
          (loaded) => this.ngZone.run(() => this.onProgress(loaded)),
          requestId,
        );
        this.sessionId = info.sessionId;
        this.sessionPresetId = this.preset.id;
        this.downloading = false;
        this.availability = 'available';
      }
      this.busyLabel = 'Classifying...';
      this.cdr.detectChanges();
      const start = performance.now();
      this.result = await this.classifierManager.classify(this.sessionId!, this.input, {}, requestId);
      this.elapsedMs = Math.round(performance.now() - start);
    } catch (e: any) {
      this.error = `${e.name ?? 'Error'}: ${e.message}`;
      if (e.name === 'InvalidStateError') this.dropSession();
      this.refreshStatus();
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

  copyCode(): void {
    navigator.clipboard.writeText(this.code).catch(() => undefined);
  }

  private onProgress(loaded: number): void {
    this.downloading = loaded < 1;
    this.downloadProgress = Math.round(loaded * 100);
    this.availability = loaded < 1 ? 'downloading' : 'available';
    this.cdr.detectChanges();
  }

  private dropSession(): void {
    if (this.sessionId) this.classifierManager.destroySession(this.sessionId).catch(() => undefined);
    this.sessionId = null;
    this.sessionPresetId = null;
  }
}
