import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { AiModelDataService } from '../../services/ai-model-data.service';
import { AiModel } from '../../interfaces/data/ai-model.interface';
import {
  ToastService,
  ClassifierManager,
  ClassifierModelStatus,
  ClassifierModelState,
  ClassifierModelVariant,
  CLASSIFIER_MODEL_REGISTRY,
} from 'base';

@Component({
  selector: 'app-models',
  templateUrl: './models.component.html',
  styleUrls: ['./models.component.scss'],
  standalone: false
})
export class ModelsComponent implements OnInit, OnDestroy {
  models: AiModel[] = [];

  readonly classifierVariants: ClassifierModelVariant[] = CLASSIFIER_MODEL_REGISTRY;
  classifierStatuses = new Map<string, ClassifierModelStatus>();
  activeClassifierVariantId = '';
  classifierProgress = new Map<string, number>();
  classifierRequests = new Map<string, string>();
  readonly ClassifierModelState = ClassifierModelState;

  private subscriptions: Subscription[] = [];

  constructor(
    private aiModelDataService: AiModelDataService,
    private classifierManager: ClassifierManager,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.loadModels();
    this.loadClassifierModels();
    this.subscriptions.push(this.classifierManager.modelsChangedEvent.subscribe(() => this.loadClassifierModels()));
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async loadModels() {
    this.models = await this.aiModelDataService.getModels();
    this.cdr.detectChanges();
  }

  async loadClassifierModels() {
    try {
      const { activeVariantId, models } = await this.classifierManager.listModels();
      this.activeClassifierVariantId = activeVariantId;
      this.classifierStatuses = new Map(models.map((m) => [m.variantId, m]));
    } catch (e: any) {
      this.toastService.show(`Classifier runtime: ${e.message}`, 'error');
    }
    this.cdr.detectChanges();
  }

  classifierStatus(variantId: string): ClassifierModelStatus | undefined {
    return this.classifierStatuses.get(variantId);
  }

  formatBytes(bytes: number): string {
    return `${Math.round(bytes / 1_000_000)} MB`;
  }

  async setActiveClassifier(variantId: string) {
    await this.classifierManager.setActiveVariantId(variantId);
    this.toastService.show('Active classifier model updated.', 'success');
  }

  async downloadClassifier(variant: ClassifierModelVariant) {
    if (this.classifierRequests.has(variant.id)) return;
    const requestId = crypto.randomUUID();
    this.classifierRequests.set(variant.id, requestId);
    this.classifierProgress.set(variant.id, 0);
    this.cdr.detectChanges();
    try {
      await this.classifierManager.downloadModel(
        variant.id,
        (loaded) => this.ngZone.run(() => {
          this.classifierProgress.set(variant.id, Math.round(loaded * 100));
          this.cdr.detectChanges();
        }),
        requestId,
      );
      this.toastService.show(`Downloaded ${variant.name}`, 'success');
    } catch (e: any) {
      this.toastService.show(`Download failed: ${e.message}`, 'error');
    } finally {
      this.classifierRequests.delete(variant.id);
      this.classifierProgress.delete(variant.id);
      this.loadClassifierModels();
    }
  }

  cancelClassifierDownload(variantId: string) {
    const requestId = this.classifierRequests.get(variantId);
    if (requestId) this.classifierManager.abort(requestId);
  }

  async deleteClassifier(variant: ClassifierModelVariant) {
    if (!confirm(`Delete the cached files of "${variant.name}"?`)) return;
    try {
      await this.classifierManager.deleteModel(variant.id);
      this.toastService.show(`Deleted ${variant.name}`, 'success');
    } catch (e: any) {
      this.toastService.show(`Delete failed: ${e.message}`, 'error');
    }
  }

  async unloadClassifier() {
    await this.classifierManager.unloadModel();
    this.toastService.show('Classifier model unloaded from memory.', 'success');
  }

  deleteModel(name: string) {
    this.toastService.show(`Deleted ${name}`, 'success');
    // TODO: Implement actual deletion
  }

  downloadModel(name: string) {
    this.toastService.show(`Downloading ${name}...`, 'success');
    // TODO: Implement actual download
  }
}
