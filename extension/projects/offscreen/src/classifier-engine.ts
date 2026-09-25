import { ClassifierSchemaValidator } from './classifier-schema.validator';
import { ClassifierSchemaMapper } from './classifier-schema.mapper';
import { ClassifierModelStore } from './classifier-model-store';
import { ClassifierModelLoader } from './classifier-model-loader';
import { ClassifierLoadedModel } from './classifier-loaded-model.interface';
import { ClassifierSession } from './classifier-session.interface';
import { ClassifierCompiledQuestion } from './classifier-compiled-question.interface';
import { ClassifierNormalizedSchema } from './classifier-normalized-schema.interface';
import { ClassifierAvailability } from '../../base/src/lib/classifier/types/classifier-availability.type';
import { ClassifierSessionInfo } from '../../base/src/lib/classifier/interfaces/classifier-session-info.interface';
import { ClassifierResult } from '../../base/src/lib/classifier/types/classifier-result.type';
import { ClassifierClassifyOptions } from '../../base/src/lib/classifier/interfaces/classifier-classify-options.interface';
import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import { ClassifierModelStatus } from '../../base/src/lib/classifier/interfaces/classifier-model-status.interface';
import { ClassifierModelState } from '../../base/src/lib/classifier/enums/classifier-model-state.enum';
import { ClassifierSettingsKey } from '../../base/src/lib/classifier/enums/classifier-settings-key.enum';
import {
  CLASSIFIER_MODEL_REGISTRY,
  DEFAULT_CLASSIFIER_MODEL_VARIANT_ID,
} from '../../base/src/lib/classifier/registry/classifier-model-registry.const';
import {
  classifierModelTotalBytes,
  findClassifierModelVariant,
} from '../../base/src/lib/classifier/registry/classifier-model-registry.utils';

declare const chrome: any;

const MULTILINGUAL = 'multilingual';

/**
 * The Classifier polyfill's brain: validates schemas, manages the cached and
 * loaded model, keeps sessions, and turns Laya answers into explainer decisions.
 * One instance lives in the offscreen document for the whole browser.
 */
export class ClassifierEngine {
  private readonly sessions = new Map<string, ClassifierSession>();
  private readonly downloads = new Map<string, Promise<void>>();
  private loaded: ClassifierLoadedModel | null = null;
  private loading: Promise<ClassifierLoadedModel> | null = null;

  constructor(private readonly store: ClassifierModelStore) {}

  // ---------------------------------------------------------------------------
  // Explainer surface
  // ---------------------------------------------------------------------------

  async availability(schema: unknown): Promise<ClassifierAvailability> {
    const normalized = ClassifierSchemaValidator.validate(schema, false);
    const variant = await this.activeVariant();
    if (!this.supportsExpectedInputs(normalized, variant)) return 'unavailable';
    if (this.downloads.has(variant.id)) return 'downloading';
    const status = await this.store.status(variant);
    return status.complete ? 'available' : 'downloadable';
  }

  async create(
    schema: unknown,
    onProgress: (loaded: number) => void,
    signal?: AbortSignal,
  ): Promise<ClassifierSessionInfo> {
    const normalized = ClassifierSchemaValidator.validate(schema, true);
    const variant = await this.activeVariant();
    if (!this.supportsExpectedInputs(normalized, variant)) {
      throw new DOMException('The requested expectedInputs are not supported by the active classifier model.', 'NotSupportedError');
    }

    await this.ensureDownloaded(variant, onProgress, signal);
    signal?.throwIfAborted();
    const model = await this.ensureLoaded(variant);
    signal?.throwIfAborted();
    onProgress(1);

    const questions = normalized.questions.map((q) => this.compile(q, normalized.context, model));
    const session: ClassifierSession = {
      id: crypto.randomUUID(),
      variantId: variant.id,
      questions,
      contextWindow: model.host.window,
      contextUsage: Math.max(0, ...questions.map((q) => q.headTokens)),
    };
    this.sessions.set(session.id, session);
    return { sessionId: session.id, contextWindow: session.contextWindow, contextUsage: session.contextUsage };
  }

  async classify(
    sessionId: string,
    input: unknown,
    options: ClassifierClassifyOptions | undefined,
    signal?: AbortSignal,
  ): Promise<ClassifierResult> {
    const session = this.session(sessionId);
    const state = this.state(input, options);
    const model = await this.ensureLoaded(this.variantOf(session));
    const stateTokens = model.host.measureState(state);

    for (const q of session.questions) {
      if (stateTokens > q.stateRoom) {
        throw new DOMException(
          `Input uses ${stateTokens} tokens but question "${q.id}" leaves room for ${q.stateRoom} (context window ${session.contextWindow}).`,
          'QuotaExceededError',
        );
      }
    }

    const result: ClassifierResult = {};
    for (const q of session.questions) {
      signal?.throwIfAborted();
      const answer = await model.host.predict(state, q.laya);
      result[q.id] = ClassifierSchemaMapper.toDecision(q.id, q.type, q.labels, q.levels, answer);
    }
    return result;
  }

  async measureContextUsage(sessionId: string, input: unknown, options?: ClassifierClassifyOptions): Promise<number> {
    const session = this.session(sessionId);
    const model = await this.ensureLoaded(this.variantOf(session));
    return model.host.measureState(this.state(input, options));
  }

  destroy(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // ---------------------------------------------------------------------------
  // Model management
  // ---------------------------------------------------------------------------

  async listModels(): Promise<{ activeVariantId: string; models: ClassifierModelStatus[] }> {
    const active = await this.activeVariant();
    const models: ClassifierModelStatus[] = [];
    for (const variant of CLASSIFIER_MODEL_REGISTRY) {
      const status = await this.store.status(variant);
      const loaded = this.loaded?.variant.id === variant.id;
      models.push({
        variantId: variant.id,
        state: this.downloads.has(variant.id)
          ? ClassifierModelState.DOWNLOADING
          : status.complete
            ? ClassifierModelState.CACHED
            : ClassifierModelState.DOWNLOADABLE,
        cachedBytes: status.cachedBytes,
        totalBytes: classifierModelTotalBytes(variant),
        loaded,
        accelerator: loaded ? this.loaded!.accelerator : undefined,
      });
    }
    return { activeVariantId: active.id, models };
  }

  async downloadModel(variantId: string, onProgress: (loaded: number) => void, signal?: AbortSignal): Promise<void> {
    await this.ensureDownloaded(this.variant(variantId), onProgress, signal);
  }

  async deleteModel(variantId: string): Promise<void> {
    const variant = this.variant(variantId);
    if (this.loaded?.variant.id === variantId) this.unloadModel();
    await this.store.delete(variant);
  }

  unloadModel(): void {
    this.loaded?.host.delete();
    this.loaded = null;
    this.loading = null;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private compile(
    question: ClassifierNormalizedSchema['questions'][number],
    context: string,
    model: ClassifierLoadedModel,
  ): ClassifierCompiledQuestion {
    const laya = ClassifierSchemaMapper.toLayaQuestion(question, context);
    try {
      model.host.assertOptionsFit(laya);
    } catch {
      throw new DOMException(
        `Question "${question.id}" has more options than fit in the model's head budget (${model.variant.headMaxLen} tokens).`,
        'QuotaExceededError',
      );
    }
    return {
      id: question.id,
      type: question.type,
      labels: ClassifierSchemaMapper.labels(question),
      levels: ClassifierSchemaMapper.levels(question),
      laya,
      headTokens: model.host.measureHead(laya),
      stateRoom: model.host.stateRoom(laya),
    };
  }

  private state(input: unknown, options: ClassifierClassifyOptions | undefined): string {
    if (typeof input !== 'string') {
      throw new TypeError("Failed to execute 'classify' on 'Classifier': parameter 1 is not a string.");
    }
    const context = options?.context;
    if (context !== undefined && typeof context !== 'string') {
      throw new TypeError("Failed to read the 'context' property: The provided value is not a string.");
    }
    return ClassifierSchemaMapper.state(input, context);
  }

  private session(sessionId: string): ClassifierSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new DOMException('The classifier session has been destroyed.', 'InvalidStateError');
    return session;
  }

  private supportsExpectedInputs(schema: ClassifierNormalizedSchema, variant: ClassifierModelVariant): boolean {
    for (const expected of schema.expectedInputs) {
      if (expected.type !== 'text') return false;
      if (variant.languages.includes(MULTILINGUAL)) continue;
      for (const language of expected.languages ?? []) {
        const primary = language.toLowerCase().split('-')[0];
        if (!variant.languages.includes(primary)) return false;
      }
    }
    return true;
  }

  private async ensureDownloaded(
    variant: ClassifierModelVariant,
    onProgress: (loaded: number) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const status = await this.store.status(variant);
    if (status.complete) return;

    let download = this.downloads.get(variant.id);
    if (!download) {
      const controller = new AbortController();
      const listeners = new Set<(loaded: number) => void>();
      listeners.add(onProgress);
      download = this.store
        .download(variant, (loaded) => listeners.forEach((l) => l(loaded)), controller.signal)
        .finally(() => this.downloads.delete(variant.id));
      (download as any).__listeners = listeners;
      (download as any).__controller = controller;
      this.downloads.set(variant.id, download);
    } else {
      ((download as any).__listeners as Set<(loaded: number) => void>).add(onProgress);
    }

    if (signal) {
      const onAbort = () => {
        // Only the last interested caller stops the shared download.
        const listeners = (download as any).__listeners as Set<(loaded: number) => void>;
        listeners.delete(onProgress);
        if (listeners.size === 0) ((download as any).__controller as AbortController).abort();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      try {
        await Promise.race([download, ClassifierEngine.rejectOnAbort(signal)]);
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
      return;
    }
    await download;
  }

  private ensureLoaded(variant: ClassifierModelVariant): Promise<ClassifierLoadedModel> {
    if (this.loaded?.variant.id === variant.id) return Promise.resolve(this.loaded);
    if (this.loading && this.loaded === null) return this.loading;

    this.unloadModel();
    this.loading = ClassifierModelLoader.load(variant, this.store)
      .then((model) => {
        this.loaded = model;
        return model;
      })
      .catch((e) => {
        this.loading = null;
        throw e;
      });
    return this.loading;
  }

  private variantOf(session: ClassifierSession): ClassifierModelVariant {
    return this.variant(session.variantId);
  }

  private variant(variantId: string): ClassifierModelVariant {
    const variant = findClassifierModelVariant(variantId);
    if (!variant) throw new DOMException(`Unknown classifier model "${variantId}".`, 'NotSupportedError');
    return variant;
  }

  private async activeVariant(): Promise<ClassifierModelVariant> {
    const id = await ClassifierEngine.readSetting<string>(
      ClassifierSettingsKey.MODEL_VARIANT,
      DEFAULT_CLASSIFIER_MODEL_VARIANT_ID,
    );
    return findClassifierModelVariant(id) ?? findClassifierModelVariant(DEFAULT_CLASSIFIER_MODEL_VARIANT_ID)!;
  }

  private static readSetting<T>(key: string, defaultValue: T): Promise<T> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'get_setting', key, defaultValue }, (response: any) => {
          if (chrome.runtime.lastError || response?.value === undefined) resolve(defaultValue);
          else resolve(response.value as T);
        });
      } catch {
        resolve(defaultValue);
      }
    });
  }

  private static rejectOnAbort(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }
}
