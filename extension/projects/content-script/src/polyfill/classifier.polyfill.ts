import { ClassifierPageBridge } from './classifier-page-bridge';
import { ClassifierRuntimeOp } from '../../../base/src/lib/classifier/enums/classifier-runtime-op.enum';
import { ClassifierSessionInfo } from '../../../base/src/lib/classifier/interfaces/classifier-session-info.interface';
import { ClassifierSchema } from '../../../base/src/lib/classifier/interfaces/classifier-schema.interface';
import { ClassifierResult } from '../../../base/src/lib/classifier/types/classifier-result.type';
import { ClassifierAvailability } from '../../../base/src/lib/classifier/types/classifier-availability.type';
import { ClassifierClassifyOptions } from '../../../base/src/lib/classifier/interfaces/classifier-classify-options.interface';

const CREATE_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const CLASSIFY_TIMEOUT_MS = 30 * 60 * 1000;

const CONSTRUCTOR_TOKEN = Symbol('DecisionModel.create');

/**
 * `window.DecisionModel` (and `window.Classifier` alias) polyfill following the Decisions API explainer:
 *
 * - `DecisionModel.availability(options)` / `DecisionModel.create(options)`
 * - `classify(input, options)` / `decide(input, options)` resolves to a record keyed by question id
 * - `contextWindow`, `contextUsage`, `measureContextUsage(input, options)`
 * - `destroy()`
 *
 * Inference runs in the extension's offscreen document (LiteRT.js + Laya).
 */
export class DecisionModel {
  private sessionId: string;
  private readonly contextWindowValue: number;
  private readonly contextUsageValue: number;
  private destroyed = false;

  constructor(token?: symbol, info?: ClassifierSessionInfo) {
    if (token !== CONSTRUCTOR_TOKEN || !info) {
      throw new TypeError('Illegal constructor');
    }
    this.sessionId = info.sessionId;
    this.contextWindowValue = info.contextWindow;
    this.contextUsageValue = info.contextUsage;
  }

  static async availability(options: unknown = {}): Promise<ClassifierAvailability> {
    const schema = DecisionModel.toSchema(options);
    try {
      return await ClassifierPageBridge.request<ClassifierAvailability>(ClassifierRuntimeOp.AVAILABILITY, { schema });
    } catch (e) {
      // Schema problems are the caller's; runtime problems mean the API cannot serve right now.
      if (e instanceof TypeError) throw e;
      console.warn(
        '[WebAI] DecisionModel polyfill: availability() could not reach the extension runtime, reporting "unavailable".',
        e,
      );
      return 'unavailable';
    }
  }

  static async create(options: unknown): Promise<DecisionModel> {
    if (options === null || typeof options !== 'object') {
      throw new TypeError("Failed to execute 'create' on 'DecisionModel': parameter 1 is not a dictionary.");
    }
    const { monitor, signal } = options as { monitor?: unknown; signal?: unknown };
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("Failed to read the 'signal' property: The provided value is not an AbortSignal.");
    }
    if (monitor !== undefined && typeof monitor !== 'function') {
      throw new TypeError("Failed to read the 'monitor' property: The provided value is not a function.");
    }
    signal?.throwIfAborted();
    const schema = DecisionModel.toSchema(options);

    const monitorTarget = new EventTarget();
    if (monitor) (monitor as (m: EventTarget) => void)(monitorTarget);

    const requestId = crypto.randomUUID();
    const onAbort = () => ClassifierPageBridge.abort(requestId);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const info = await Promise.race([
        ClassifierPageBridge.request<ClassifierSessionInfo>(
          ClassifierRuntimeOp.CREATE,
          { schema },
          {
            requestId,
            timeoutMs: CREATE_TIMEOUT_MS,
            onProgress: (loaded) =>
              monitorTarget.dispatchEvent(
                new ProgressEvent('downloadprogress', { lengthComputable: true, loaded, total: 1 }),
              ),
          },
        ),
        DecisionModel.rejectOnAbort(signal),
      ]);
      return new DecisionModel(CONSTRUCTOR_TOKEN, info);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        console.warn('[WebAI] DecisionModel polyfill: create() failed in the extension runtime.', e);
        throw new DOMException(`DecisionModel polyfill: ${e.message}`, 'InvalidStateError');
      }
      throw e;
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  get contextWindow(): number {
    return this.contextWindowValue;
  }

  get contextUsage(): number {
    return this.contextUsageValue;
  }

  async decide(input: unknown, options: unknown = {}): Promise<ClassifierResult> {
    this.assertAlive('decide');
    const { signal, classifyOptions } = DecisionModel.toDecideOptions(options, 'decide');
    signal?.throwIfAborted();

    const requestId = crypto.randomUUID();
    const onAbort = () => ClassifierPageBridge.abort(requestId);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await Promise.race([
        ClassifierPageBridge.request<ClassifierResult>(
          ClassifierRuntimeOp.CLASSIFY,
          { sessionId: this.sessionId, input: DecisionModel.toDomString(input), options: classifyOptions },
          { requestId, timeoutMs: CLASSIFY_TIMEOUT_MS },
        ),
        DecisionModel.rejectOnAbort(signal),
      ]);
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  /** Backward-compatible alias for `decide`. */
  async classify(input: unknown, options: unknown = {}): Promise<ClassifierResult> {
    return this.decide(input, options);
  }

  async measureContextUsage(input: unknown, options: unknown = {}): Promise<number> {
    this.assertAlive('measureContextUsage');
    const { signal, classifyOptions } = DecisionModel.toDecideOptions(options, 'measureContextUsage');
    signal?.throwIfAborted();
    return ClassifierPageBridge.request<number>(ClassifierRuntimeOp.MEASURE_CONTEXT_USAGE, {
      sessionId: this.sessionId,
      input: DecisionModel.toDomString(input),
      options: classifyOptions,
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    ClassifierPageBridge.request(ClassifierRuntimeOp.DESTROY, { sessionId: this.sessionId }).catch(() => undefined);
  }

  private assertAlive(method: string): void {
    if (this.destroyed) {
      throw new DOMException(
        `Failed to execute '${method}' on 'DecisionModel': The decision model session has been destroyed.`,
        'InvalidStateError',
      );
    }
  }

  /** Keeps only the serializable dictionary members; the runtime validates them. */
  private static toSchema(options: unknown): ClassifierSchema {
    if (options === null || options === undefined) return {};
    if (typeof options !== 'object') {
      throw new TypeError("Failed to execute 'availability' on 'DecisionModel': parameter 1 is not a dictionary.");
    }
    const { context, expectedInputs, questions } = options as ClassifierSchema;
    return JSON.parse(JSON.stringify({ context, expectedInputs, questions }));
  }

  private static toDecideOptions(options: unknown, method: string = 'decide'): {
    signal: AbortSignal | undefined;
    classifyOptions: ClassifierClassifyOptions;
  } {
    if (options === null || options === undefined) return { signal: undefined, classifyOptions: {} };
    if (typeof options !== 'object') {
      throw new TypeError(`Failed to execute '${method}' on 'DecisionModel': parameter 2 is not a dictionary.`);
    }
    const { signal, context } = options as { signal?: unknown; context?: unknown };
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("Failed to read the 'signal' property: The provided value is not an AbortSignal.");
    }
    const classifyOptions: ClassifierClassifyOptions = {};
    if (context !== undefined) classifyOptions.context = DecisionModel.toDomString(context);
    return { signal: signal as AbortSignal | undefined, classifyOptions };
  }

  private static toClassifyOptions(options: unknown): {
    signal: AbortSignal | undefined;
    classifyOptions: ClassifierClassifyOptions;
  } {
    return this.toDecideOptions(options, 'classify');
  }

  /** WebIDL DOMString conversion. */
  private static toDomString(value: unknown): string {
    if (typeof value === 'symbol') throw new TypeError('Cannot convert a Symbol value to a string');
    return String(value);
  }

  private static rejectOnAbort(signal: AbortSignal | undefined): Promise<never> {
    return new Promise((_, reject) => {
      signal?.addEventListener(
        'abort',
        () => reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')),
        { once: true },
      );
    });
  }
}

export const Classifier = DecisionModel;
export type Classifier = DecisionModel;
