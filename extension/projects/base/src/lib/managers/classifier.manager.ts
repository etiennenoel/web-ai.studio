import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiStatus } from '../enums/api-status.enum';
import { ApiStatusResult, ApiCheck } from '../interfaces/api-status-result.interface';
import { ClassifierRuntimeClient } from '../classifier/messaging/classifier-runtime-client';
import { ClassifierRuntimeOp } from '../classifier/enums/classifier-runtime-op.enum';
import { ClassifierSchema } from '../classifier/interfaces/classifier-schema.interface';
import { ClassifierSessionInfo } from '../classifier/interfaces/classifier-session-info.interface';
import { ClassifierResult } from '../classifier/types/classifier-result.type';
import { ClassifierAvailability } from '../classifier/types/classifier-availability.type';
import { ClassifierClassifyOptions } from '../classifier/interfaces/classifier-classify-options.interface';
import { ClassifierModelStatus } from '../classifier/interfaces/classifier-model-status.interface';
import { ClassifierSettingsKey } from '../classifier/enums/classifier-settings-key.enum';
import { DEFAULT_CLASSIFIER_MODEL_VARIANT_ID } from '../classifier/registry/classifier-model-registry.const';
import { findClassifierModelVariant } from '../classifier/registry/classifier-model-registry.utils';

declare const chrome: any;

/**
 * Classifier API access for extension pages (devtools panel, side panel,
 * on-install page). Those pages have no `window.Classifier`, so this manager
 * talks to the offscreen runtime directly, the same runtime the page polyfill uses.
 */
@Injectable({
  providedIn: 'root',
})
export class ClassifierManager {
  /** Emitted after a model download, delete, or active-variant change. */
  readonly modelsChangedEvent = new Subject<void>();

  get isRuntimeAvailable(): boolean {
    return ClassifierRuntimeClient.isExtensionContext;
  }

  availability(schema: ClassifierSchema = {}): Promise<ClassifierAvailability> {
    return ClassifierRuntimeClient.request<ClassifierAvailability>(ClassifierRuntimeOp.AVAILABILITY, { schema });
  }

  createSession(
    schema: ClassifierSchema,
    onProgress?: (loaded: number) => void,
    requestId?: string,
  ): Promise<ClassifierSessionInfo> {
    return ClassifierRuntimeClient.request<ClassifierSessionInfo>(
      ClassifierRuntimeOp.CREATE,
      { schema },
      { requestId, onProgress },
    );
  }

  classify(
    sessionId: string,
    input: string,
    options: ClassifierClassifyOptions = {},
    requestId?: string,
  ): Promise<ClassifierResult> {
    return ClassifierRuntimeClient.request<ClassifierResult>(
      ClassifierRuntimeOp.CLASSIFY,
      { sessionId, input, options },
      { requestId },
    );
  }

  measureContextUsage(sessionId: string, input: string, options: ClassifierClassifyOptions = {}): Promise<number> {
    return ClassifierRuntimeClient.request<number>(ClassifierRuntimeOp.MEASURE_CONTEXT_USAGE, {
      sessionId,
      input,
      options,
    });
  }

  destroySession(sessionId: string): Promise<void> {
    return ClassifierRuntimeClient.request<void>(ClassifierRuntimeOp.DESTROY, { sessionId });
  }

  abort(requestId: string): void {
    ClassifierRuntimeClient.abort(requestId);
  }

  listModels(): Promise<{ activeVariantId: string; models: ClassifierModelStatus[] }> {
    return ClassifierRuntimeClient.request(ClassifierRuntimeOp.LIST_MODELS);
  }

  async downloadModel(variantId: string, onProgress?: (loaded: number) => void, requestId?: string): Promise<void> {
    await ClassifierRuntimeClient.request<void>(
      ClassifierRuntimeOp.DOWNLOAD_MODEL,
      { variantId },
      { requestId, onProgress },
    );
    this.modelsChangedEvent.next();
  }

  async deleteModel(variantId: string): Promise<void> {
    await ClassifierRuntimeClient.request<void>(ClassifierRuntimeOp.DELETE_MODEL, { variantId });
    this.modelsChangedEvent.next();
  }

  async unloadModel(): Promise<void> {
    await ClassifierRuntimeClient.request<void>(ClassifierRuntimeOp.UNLOAD_MODEL);
    this.modelsChangedEvent.next();
  }

  getActiveVariantId(): Promise<string> {
    return this.getSetting<string>(ClassifierSettingsKey.MODEL_VARIANT, DEFAULT_CLASSIFIER_MODEL_VARIANT_ID).then(
      (id) => (findClassifierModelVariant(id) ? id : DEFAULT_CLASSIFIER_MODEL_VARIANT_ID),
    );
  }

  async setActiveVariantId(variantId: string): Promise<void> {
    await this.setSetting(ClassifierSettingsKey.MODEL_VARIANT, variantId);
    this.modelsChangedEvent.next();
  }

  isPolyfillEnabled(): Promise<boolean> {
    return this.getSetting<boolean>(ClassifierSettingsKey.POLYFILL_ENABLED, true).then((v) => v !== false);
  }

  setPolyfillEnabled(enabled: boolean): Promise<void> {
    return this.setSetting(ClassifierSettingsKey.POLYFILL_ENABLED, enabled);
  }

  getCodeSnippet(schema: ClassifierSchema, input: string): string {
    return `const schema = ${JSON.stringify(schema, null, 2)};

const status = await Classifier.availability(schema);

if (status === "available" || status === "downloadable") {
  const classifier = await Classifier.create({
    ...schema,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        console.log(\`Downloaded \${Math.round(e.loaded * 100)}%\`);
      });
    }
  });

  const result = await classifier.classify(${JSON.stringify(input)});
  console.log(result);

  classifier.destroy();
}`;
  }

  async getStatus(): Promise<ApiStatusResult> {
    const checks: ApiCheck[] = [];
    let status = ApiStatus.UNKNOWN;
    let message = '';
    let errorHtml: string | undefined;

    if (!this.isRuntimeAvailable) {
      return {
        status: ApiStatus.UNAVAILABLE,
        message: 'Extension runtime unavailable.',
        checks: [{ titleHtml: 'Extension runtime (<code>chrome.runtime</code>)', success: false }],
      };
    }

    const polyfillEnabled = await this.isPolyfillEnabled();
    checks.push({ titleHtml: 'Polyfill enabled in Settings', success: polyfillEnabled });

    try {
      await ClassifierRuntimeClient.ensureRuntime();
      checks.push({ titleHtml: 'Offscreen runtime (LiteRT.js)', success: true });
    } catch (e: any) {
      checks.push({ titleHtml: `Offscreen runtime: ${e.message}`, success: false });
      return {
        status: ApiStatus.ERROR,
        message: 'Classifier runtime failed to start.',
        checks,
        errorHtml: `
          <h4 class="text-xs font-bold text-red-200 uppercase mb-2"><i class="fa-solid fa-exclamation-triangle mr-1"></i> Runtime Error</h4>
          <div class="text-xs text-red-100"><p class="mb-2">The offscreen document that runs the classifier model did not start: <code>${e.message}</code></p>
          <ul class="list-disc pl-4 space-y-1"><li>Reload the extension from <code>chrome://extensions</code>.</li><li>Check the offscreen document's console for errors.</li></ul></div>`,
      };
    }

    const activeVariantId = await this.getActiveVariantId();
    const variant = findClassifierModelVariant(activeVariantId);
    checks.push({ titleHtml: `Active model: <code>${variant?.name ?? activeVariantId}</code>`, success: !!variant });

    try {
      const availability = await this.availability({});
      checks.push({ titleHtml: 'Availability Check', success: availability !== 'unavailable' });
      status = availability as ApiStatus;

      if (status === ApiStatus.AVAILABLE) {
        message = 'Ready (polyfill)';
      } else if (status === ApiStatus.DOWNLOADABLE) {
        message = 'Model available for download.';
        errorHtml = `
          <h4 class="text-xs font-bold text-orange-200 uppercase mb-2"><i class="fa-solid fa-cloud-arrow-down mr-1"></i> Model Download Required</h4>
          <div class="text-xs text-orange-100">
            <p class="mb-2">The classifier model (${variant?.name ?? activeVariantId}) is downloaded from Hugging Face on first use.</p>
            <ul class="list-disc pl-4 space-y-1">
              <li>Go to the <strong>Models</strong> tab and click <strong>Download</strong>, or</li>
              <li>run a classification below; <code>Classifier.create()</code> downloads it and reports progress.</li>
            </ul>
          </div>`;
      } else if (status === ApiStatus.DOWNLOADING) {
        message = 'Model is downloading.';
      } else {
        message = 'Classifier API unavailable.';
        status = ApiStatus.UNAVAILABLE;
        errorHtml = `
          <h4 class="text-xs font-bold text-red-200 uppercase mb-2"><i class="fa-solid fa-ban mr-1"></i> API Unavailable</h4>
          <div class="text-xs text-red-100"><p class="mb-2">The active model cannot serve this request. Pick another model in Settings.</p></div>`;
      }
    } catch (e: any) {
      status = ApiStatus.ERROR;
      message = `Error: ${e.message}`;
      checks.push({ titleHtml: `Check Failed: ${e.message}`, success: false });
      errorHtml = `
        <h4 class="text-xs font-bold text-red-200 uppercase mb-2"><i class="fa-solid fa-exclamation-triangle mr-1"></i> Error Details</h4>
        <div class="text-xs text-red-100"><p class="mb-2">An error occurred while checking the Classifier API availability: <code>${e.message}</code></p></div>`;
    }

    return { status, message, checks, errorHtml };
  }

  private getSetting<T>(key: string, defaultValue: T): Promise<T> {
    return new Promise((resolve) => {
      if (!this.isRuntimeAvailable) return resolve(defaultValue);
      chrome.runtime.sendMessage({ action: 'get_setting', key, defaultValue }, (response: any) => {
        if (chrome.runtime.lastError || response?.value === undefined) resolve(defaultValue);
        else resolve(response.value as T);
      });
    });
  }

  private setSetting(key: string, value: unknown): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRuntimeAvailable) return resolve();
      chrome.runtime.sendMessage({ action: 'set_setting', key, value }, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    });
  }
}
