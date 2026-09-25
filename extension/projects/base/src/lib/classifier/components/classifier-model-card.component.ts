import { Component, Input, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ClassifierManager } from '../../managers/classifier.manager';
import { ClassifierModelStatus } from '../interfaces/classifier-model-status.interface';
import { ClassifierModelState } from '../enums/classifier-model-state.enum';
import { ClassifierModelVariant } from '../interfaces/classifier-model-variant.interface';
import { CLASSIFIER_MODEL_REGISTRY } from '../registry/classifier-model-registry.const';
import { classifierModelTotalBytes, findClassifierModelVariant } from '../registry/classifier-model-registry.utils';

/**
 * The one place to download, delete, or switch the Laya model that powers the
 * Classifier API polyfill. Used by the DevTools panel, the Overview, and Settings.
 */
@Component({
  selector: 'lib-classifier-model-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rounded-xl border p-4 bg-gray-50 dark:bg-[#292a2d]"
         [ngClass]="runtimeError ? 'border-red-300 dark:border-red-800/60' : (isCached ? 'border-green-300 dark:border-green-800/60' : 'border-purple-300 dark:border-purple-800/60')">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
               [ngClass]="isCached ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'">
            <i class="fa-solid fa-signs-post"></i>
          </div>
          <div class="min-w-0">
            <div class="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">Classifier API model</div>
            <div class="font-semibold text-sm text-gray-900 dark:text-white truncate" [title]="variant?.name">{{ variant?.name || 'Laya' }}</div>
          </div>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0" [ngClass]="badgeClass">{{ badgeText }}</span>
      </div>

      <p *ngIf="variant" class="text-xs text-gray-600 dark:text-gray-400 mb-3">
        {{ variant.description }} {{ sizeLabel }} from Hugging Face, cached in the extension.
        Powers <code>window.Classifier</code> on every page.
      </p>

      <!-- Model selector -->
      <div *ngIf="showSelector" class="mb-3">
        <select [ngModel]="variantId" (ngModelChange)="onVariantChange($event)" [disabled]="downloading"
                class="w-full bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#5f6368] text-gray-900 dark:text-[#e8eaed] text-sm rounded-lg p-2 outline-none disabled:opacity-50">
          <option *ngFor="let v of variants" [value]="v.id">{{ v.name }} ({{ size(v) }})</option>
        </select>
      </div>

      <!-- Runtime error -->
      <div *ngIf="runtimeError" class="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 mb-3 font-mono whitespace-pre-wrap">{{ runtimeError }}</div>

      <!-- Progress -->
      <div *ngIf="downloading" class="mb-3">
        <div class="flex justify-between text-xs text-purple-700 dark:text-purple-300 mb-1">
          <span>Downloading {{ sizeLabel }}...</span><span class="font-mono">{{ progress }}%</span>
        </div>
        <div class="h-2 rounded-full bg-gray-200 dark:bg-[#3c4043] overflow-hidden">
          <div class="h-full bg-purple-500 rounded-full transition-all" [style.width.%]="progress"></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center gap-2">
        <button *ngIf="!isCached && !downloading" (click)="download()" [disabled]="busy"
                class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <i class="fa-solid fa-cloud-arrow-down"></i> Download {{ sizeLabel }}
        </button>
        <button *ngIf="downloading" (click)="cancel()"
                class="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-[#5f6368] text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <i class="fa-solid fa-xmark"></i> Cancel
        </button>
        <button *ngIf="isCached" (click)="delete()" [disabled]="busy"
                class="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-[#5f6368] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2" title="Delete the cached files">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
        <button *ngIf="status?.loaded" (click)="unload()" [disabled]="busy"
                class="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-[#5f6368] text-gray-700 dark:text-gray-300 flex items-center gap-2" title="Free memory; the model reloads on next use">
          <i class="fa-solid fa-memory"></i> Unload
        </button>
        <button *ngIf="runtimeError" (click)="refresh()"
                class="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-[#5f6368] text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <i class="fa-solid fa-rotate-right"></i> Retry
        </button>
        <span *ngIf="status?.loaded" class="ml-auto text-[11px] text-gray-500 font-mono">loaded on {{ status?.accelerator }}</span>
      </div>
    </div>
  `,
})
export class ClassifierModelCardComponent implements OnInit, OnDestroy {
  @Input() showSelector = true;

  readonly variants: ClassifierModelVariant[] = CLASSIFIER_MODEL_REGISTRY;
  variantId = '';
  variant: ClassifierModelVariant | undefined;
  status: ClassifierModelStatus | undefined;
  runtimeError = '';
  downloading = false;
  progress = 0;
  busy = false;

  private requestId: string | null = null;
  private subscription: Subscription | null = null;

  constructor(
    private readonly classifierManager: ClassifierManager,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.subscription = this.classifierManager.modelsChangedEvent.subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get isCached(): boolean {
    return this.status?.state === ClassifierModelState.CACHED;
  }

  get sizeLabel(): string {
    return this.variant ? this.size(this.variant) : '';
  }

  size(variant: ClassifierModelVariant): string {
    return `${Math.round(classifierModelTotalBytes(variant) / 1_000_000)} MB`;
  }

  get badgeText(): string {
    if (this.runtimeError) return 'Runtime error';
    if (this.downloading || this.status?.state === ClassifierModelState.DOWNLOADING) return 'Downloading';
    if (!this.status) return 'Checking';
    return this.isCached ? 'Installed' : 'Not downloaded';
  }

  get badgeClass(): string {
    if (this.runtimeError) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    if (this.downloading) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    if (!this.status) return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    return this.isCached
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
  }

  async refresh(): Promise<void> {
    if (this.downloading) return;
    try {
      const { activeVariantId, models } = await this.classifierManager.listModels();
      this.variantId = activeVariantId;
      this.variant = findClassifierModelVariant(activeVariantId);
      this.status = models.find((m) => m.variantId === activeVariantId);
      this.runtimeError = '';
    } catch (e: any) {
      this.variantId = await this.classifierManager.getActiveVariantId();
      this.variant = findClassifierModelVariant(this.variantId);
      this.status = undefined;
      this.runtimeError = `${e?.name ?? 'Error'}: ${e?.message ?? e}`;
    }
    this.cdr.detectChanges();
  }

  async onVariantChange(variantId: string): Promise<void> {
    await this.classifierManager.setActiveVariantId(variantId);
  }

  async download(): Promise<void> {
    if (!this.variant || this.downloading) return;
    this.downloading = true;
    this.busy = true;
    this.progress = 0;
    this.runtimeError = '';
    const requestId = crypto.randomUUID();
    this.requestId = requestId;
    this.cdr.detectChanges();
    try {
      await this.classifierManager.downloadModel(
        this.variant.id,
        (loaded) => this.ngZone.run(() => {
          this.progress = Math.round(loaded * 100);
          this.cdr.detectChanges();
        }),
        requestId,
      );
    } catch (e: any) {
      if (e?.name !== 'AbortError') this.runtimeError = `${e?.name ?? 'Error'}: ${e?.message ?? e}`;
    } finally {
      this.downloading = false;
      this.busy = false;
      this.requestId = null;
      await this.refresh();
    }
  }

  cancel(): void {
    if (this.requestId) this.classifierManager.abort(this.requestId);
  }

  async delete(): Promise<void> {
    if (!this.variant) return;
    if (!confirm(`Delete the cached files of "${this.variant.name}"?`)) return;
    this.busy = true;
    try {
      await this.classifierManager.deleteModel(this.variant.id);
    } catch (e: any) {
      this.runtimeError = `${e?.name ?? 'Error'}: ${e?.message ?? e}`;
    } finally {
      this.busy = false;
      await this.refresh();
    }
  }

  async unload(): Promise<void> {
    this.busy = true;
    try {
      await this.classifierManager.unloadModel();
    } finally {
      this.busy = false;
      await this.refresh();
    }
  }
}
