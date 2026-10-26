import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ClassifierQuestionModality = 'boolean' | 'choice' | 'score' | 'binary' | 'categorical' | 'ordinal';

export interface ClassifierOption {
  label: string;
  description?: string;
}

export interface ClassifierQuestion {
  id: string;
  type: ClassifierQuestionModality;
  prompt: string;
  options?: ClassifierOption[];
}

export interface ClassifierSchema {
  context?: string;
  expectedInputs?: Array<{ type: string; languages?: string[] }>;
  questions: ClassifierQuestion[];
}

export interface ClassifierOptionProbability {
  label: string;
  description?: string;
  probability: number;
}

export interface NormalizedDecision {
  id: string;
  type: 'boolean' | 'choice' | 'score';
  prompt: string;
  label: string;
  confidence: number;
  probability?: number | null;
  expectedScore?: number | null;
  probabilities: ClassifierOptionProbability[];
}

export interface NormalizedClassifierResult {
  decisions: NormalizedDecision[];
  byId: Record<string, NormalizedDecision>;
  elapsedMs: number;
  raw: any;
}

export interface ExtensionClassifierModelStatus {
  variantId: string;
  state: 'downloadable' | 'downloading' | 'cached' | 'error';
  cachedBytes: number;
  totalBytes: number;
  loaded: boolean;
  accelerator?: 'webgpu' | 'wasm';
}

export interface ExtensionClassifierModelList {
  activeVariantId: string;
  models: ExtensionClassifierModelStatus[];
}

@Injectable({
  providedIn: 'root'
})
export class ClassifierService {
  private readonly isBrowser: boolean;
  private readonly sessions = new Map<string, any>();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  getNativeApi(): any {
    if (!this.isBrowser) return null;
    return (window as any).DecisionModel ?? (window as any).Classifier ?? null;
  }

  isSupported(): boolean {
    return this.getNativeApi() !== null;
  }

  /** True when `window.DecisionModel` is provided by the WebAI Studio extension rather than the browser. */
  isPolyfilled(): boolean {
    if (!this.isBrowser) return false;
    return (window as any).webai?.decisions?.isPolyfilled === true || (window as any).webai?.classifier?.isPolyfilled === true;
  }

  async availability(schema?: ClassifierSchema): Promise<string> {
    const api = this.getNativeApi();
    if (!api) return 'unavailable';
    try {
      const targetSchema: ClassifierSchema = schema ?? {
        context: 'Availability check',
        questions: [{ id: 'ready', type: 'boolean', prompt: 'Is this valid?' }]
      };
      return await api.availability(targetSchema);
    } catch {
      return 'unavailable';
    }
  }

  async getClassifier(
    schema: ClassifierSchema,
    onDownloadProgress?: (loaded: number) => void,
    signal?: AbortSignal
  ): Promise<any> {
    const api = this.getNativeApi();
    if (!api) {
      throw new Error('window.DecisionModel is not available in this browser.');
    }

    const cacheKey = JSON.stringify(schema);
    const existing = this.sessions.get(cacheKey);
    if (existing) return existing;

    const createOpts: any = {
      ...schema,
      monitor: (m: any) =>
        m.addEventListener('downloadprogress', (e: any) => onDownloadProgress?.(e.loaded))
    };
    if (signal) createOpts.signal = signal;

    const session = await api.create(createOpts);
    this.sessions.set(cacheKey, session);
    return session;
  }

  async decide(
    schema: ClassifierSchema,
    input: string,
    options: { signal?: AbortSignal; onDownloadProgress?: (loaded: number) => void } = {}
  ): Promise<NormalizedClassifierResult> {
    const t0 = performance.now();
    const classifier = await this.getClassifier(schema, options.onDownloadProgress, options.signal);

    const classifyOpts: any = {};
    if (options.signal) classifyOpts.signal = options.signal;

    const raw = typeof classifier.decide === 'function'
      ? await classifier.decide(input, classifyOpts)
      : await classifier.classify(input, classifyOpts);
    const elapsedMs = Number((performance.now() - t0).toFixed(1));
    return this.normalizeResult(schema, raw, elapsedMs);
  }

  /** Backward-compatible alias for `decide`. */
  classify(
    schema: ClassifierSchema,
    input: string,
    options: { signal?: AbortSignal; onDownloadProgress?: (loaded: number) => void } = {}
  ): Promise<NormalizedClassifierResult> {
    return this.decide(schema, input, options);
  }

  /** Destroys all cached DecisionModel sessions. */
  clearSessions(): void {
    for (const session of this.sessions.values()) {
      try {
        session?.destroy?.();
      } catch {}
    }
    this.sessions.clear();
  }

  /** Queries the WebAI Extension offscreen runtime for available Laya model variants. */
  async listExtensionModels(): Promise<ExtensionClassifierModelList | null> {
    if (!this.isBrowser) return null;
    try {
      return await this.sendExtensionRequest<ExtensionClassifierModelList>('list_models', {}, { timeoutMs: 3500 });
    } catch {
      return null;
    }
  }

  /** Switches the active Laya model variant in the WebAI Extension offscreen runtime. */
  async setActiveExtensionModel(variantId: string): Promise<ExtensionClassifierModelList | null> {
    if (!this.isBrowser) return null;
    this.clearSessions();
    return await this.sendExtensionRequest<ExtensionClassifierModelList>('set_active_model', { variantId }, { timeoutMs: 8000 });
  }

  /** Downloads a Laya model variant into the WebAI Extension OPFS cache. */
  async downloadExtensionModel(
    variantId: string,
    onProgress?: (loaded: number) => void
  ): Promise<void> {
    if (!this.isBrowser) return;
    await this.sendExtensionRequest<void>('download_model', { variantId }, {
      timeoutMs: 30 * 60 * 1000,
      onProgress,
    });
  }

  /** Unloads the currently loaded Laya model from WebGPU/WASM memory (for cold-start benchmarking). */
  async unloadExtensionModel(): Promise<void> {
    if (!this.isBrowser) return;
    this.clearSessions();
    try {
      await this.sendExtensionRequest<void>('unload_model', {}, { timeoutMs: 5000 });
    } catch {}
  }

  private sendExtensionRequest<T>(
    op: string,
    payload: unknown,
    options: { onProgress?: (loaded: number) => void; timeoutMs?: number } = {}
  ): Promise<T> {
    const requestId = crypto.randomUUID();
    const messageId = `webai-classifier-${requestId}`;
    const timeoutMs = options.timeoutMs ?? 15000;

    return new Promise<T>((resolve, reject) => {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        window.removeEventListener('message', listener);
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      };

      const listener = (event: MessageEvent) => {
        if (event.source !== window || !event.data) return;
        const data = event.data;
        if (data.type === 'WEBAI_CLASSIFIER_PROGRESS' && data.requestId === requestId) {
          options.onProgress?.(Number(data.loaded));
          return;
        }
        if (data.type !== 'WEBAI_CLASSIFIER_RESPONSE' || data.messageId !== messageId) return;
        cleanup();
        const response = data.data;
        if (response?.ok) resolve(response.value as T);
        else reject(new Error(response?.error?.message ?? 'Extension runtime request failed.'));
      };

      window.addEventListener('message', listener);
      window.postMessage(
        { type: 'WEBAI_CLASSIFIER_REQUEST', messageId, op, requestId, payload },
        '*'
      );

      timeoutHandle = setTimeout(() => {
        cleanup();
        reject(new Error(`Extension runtime timed out (${op}).`));
      }, timeoutMs);
    });
  }

  private normalizeModality(type: ClassifierQuestionModality): 'boolean' | 'choice' | 'score' {
    if (type === 'boolean' || type === 'binary') return 'boolean';
    if (type === 'score' || type === 'ordinal') return 'score';
    return 'choice';
  }

  normalizeResult(
    schema: ClassifierSchema,
    raw: any,
    elapsedMs: number
  ): NormalizedClassifierResult {
    const decisions: NormalizedDecision[] = [];
    const byId: Record<string, NormalizedDecision> = {};

    const rawDecisionsArray: any[] = Array.isArray(raw?.decisions) ? raw.decisions : [];

    for (const q of schema.questions) {
      const modality = this.normalizeModality(q.type);
      const entry =
        rawDecisionsArray.find((d: any) => (d?.id ?? d?.questionId) === q.id) ??
        raw?.[q.id] ??
        {};

      const probs: ClassifierOptionProbability[] = Array.isArray(entry.probabilities)
        ? entry.probabilities.map((p: any) => ({
            label: String(p.label ?? p.option ?? ''),
            description: p.description,
            probability: Number(p.probability ?? 0)
          }))
        : entry.probabilities && typeof entry.probabilities === 'object'
        ? Object.entries(entry.probabilities).map(([label, prob]) => ({
            label,
            probability: Number(prob ?? 0)
          }))
        : [];

      let rawLabel = entry.label ?? entry.choice ?? entry.value;
      if ((rawLabel === undefined || rawLabel === null || rawLabel === '') && probs.length > 0) {
        const best = [...probs].sort((a, b) => b.probability - a.probability)[0];
        rawLabel = best?.label;
      }

      if (modality === 'boolean') {
        if (typeof rawLabel === 'boolean') {
          rawLabel = rawLabel ? 'true' : 'false';
        } else if (typeof rawLabel === 'string') {
          const lower = rawLabel.toLowerCase().trim();
          if (lower === 'yes' || lower === '1' || lower === 'true') rawLabel = 'true';
          else if (lower === 'no' || lower === '0' || lower === 'false') rawLabel = 'false';
        }
        if (
          (rawLabel !== 'true' && rawLabel !== 'false') &&
          entry.probability !== undefined &&
          entry.probability !== null
        ) {
          rawLabel = Number(entry.probability) >= 0.5 ? 'true' : 'false';
        }
      }

      const scoreVal =
        entry.expectedScore !== undefined && entry.expectedScore !== null
          ? entry.expectedScore
          : entry.score;

      const topProb = probs.length > 0 ? Math.max(...probs.map((p) => p.probability)) : 0;
      const inferredBooleanProb =
        modality === 'boolean' ? probs.find((p) => p.label === 'true')?.probability ?? null : null;

      const nd: NormalizedDecision = {
        id: q.id,
        type: modality,
        prompt: q.prompt,
        label: String(rawLabel ?? ''),
        confidence: entry.confidence !== undefined && entry.confidence !== null ? Number(entry.confidence) : topProb,
        probability:
          entry.probability !== undefined && entry.probability !== null
            ? Number(entry.probability)
            : inferredBooleanProb,
        expectedScore: scoreVal !== undefined && scoreVal !== null ? Number(scoreVal) : null,
        probabilities: probs
      };

      decisions.push(nd);
      byId[q.id] = nd;
    }

    return {
      decisions,
      byId,
      elapsedMs,
      raw
    };
  }
}
