import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ClassifierQuestionModality = 'binary' | 'categorical' | 'ordinal' | 'boolean' | 'choice' | 'score';

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
  type: 'binary' | 'categorical' | 'ordinal';
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
    return (window as any).Classifier ?? null;
  }

  isSupported(): boolean {
    return this.getNativeApi() !== null;
  }

  /** True when `window.Classifier` is provided by the WebAI Studio extension rather than the browser. */
  isPolyfilled(): boolean {
    if (!this.isBrowser) return false;
    return (window as any).webai?.classifier?.isPolyfilled === true;
  }

  async availability(schema?: ClassifierSchema): Promise<string> {
    const api = this.getNativeApi();
    if (!api) return 'unavailable';
    try {
      const targetSchema: ClassifierSchema = schema ?? {
        context: 'Availability check',
        questions: [{ id: 'ready', type: 'binary', prompt: 'Is this valid?' }]
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
      throw new Error('window.Classifier is not available in this browser.');
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

  async classify(
    schema: ClassifierSchema,
    input: string,
    options: { signal?: AbortSignal; onDownloadProgress?: (loaded: number) => void } = {}
  ): Promise<NormalizedClassifierResult> {
    const t0 = performance.now();
    const classifier = await this.getClassifier(schema, options.onDownloadProgress, options.signal);

    const classifyOpts: any = {};
    if (options.signal) classifyOpts.signal = options.signal;

    const raw = await classifier.classify(input, classifyOpts);
    const elapsedMs = Number((performance.now() - t0).toFixed(1));
    return this.normalizeResult(schema, raw, elapsedMs);
  }

  private normalizeModality(type: ClassifierQuestionModality): 'binary' | 'categorical' | 'ordinal' {
    if (type === 'boolean' || type === 'binary') return 'binary';
    if (type === 'score' || type === 'ordinal') return 'ordinal';
    return 'categorical';
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
        : [];

      let rawLabel = entry.label ?? entry.choice ?? entry.value;
      if ((rawLabel === undefined || rawLabel === null || rawLabel === '') && probs.length > 0) {
        const best = [...probs].sort((a, b) => b.probability - a.probability)[0];
        rawLabel = best?.label;
      }

      if (modality === 'binary') {
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

      const nd: NormalizedDecision = {
        id: q.id,
        type: modality,
        prompt: q.prompt,
        label: String(rawLabel ?? ''),
        confidence: Number(entry.confidence ?? 0),
        probability: entry.probability !== undefined && entry.probability !== null ? Number(entry.probability) : null,
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
