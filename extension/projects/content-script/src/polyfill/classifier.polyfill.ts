import { ClassifierPageBridge } from './classifier-page-bridge';
import { ClassifierRuntimeOp } from '../../../base/src/lib/classifier/enums/classifier-runtime-op.enum';
import { ClassifierSessionInfo } from '../../../base/src/lib/classifier/interfaces/classifier-session-info.interface';
import { ClassifierSchema } from '../../../base/src/lib/classifier/interfaces/classifier-schema.interface';
import { ClassifierResult } from '../../../base/src/lib/classifier/types/classifier-result.type';
import { ClassifierAvailability } from '../../../base/src/lib/classifier/types/classifier-availability.type';
import { ClassifierClassifyOptions } from '../../../base/src/lib/classifier/interfaces/classifier-classify-options.interface';

const CREATE_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const CLASSIFY_TIMEOUT_MS = 30 * 60 * 1000;

const CONSTRUCTOR_TOKEN = Symbol('Classifier.create');

/**
 * `window.Classifier` polyfill following the Classifier API explainer
 * (https://github.com/michaelwasserman/classifier-api):
 *
 * - `Classifier.availability(options)` / `Classifier.create(options)`
 * - `classify(input, options)` resolves to a record keyed by question id
 * - `contextWindow`, `contextUsage`, `measureContextUsage(input, options)`
 * - `destroy()`
 *
 * Inference runs in the extension's offscreen document (LiteRT.js + Laya).
 */
export class Classifier {
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
    const schema = Classifier.toSchema(options);
    try {
      return await ClassifierPageBridge.request<ClassifierAvailability>(ClassifierRuntimeOp.AVAILABILITY, { schema });
    } catch (e) {
      // Schema problems are the caller's; runtime problems mean the API cannot serve right now.
      if (e instanceof TypeError) throw e;
      console.warn(
        '[WebAI] Classifier polyfill: availability() could not reach the extension runtime, reporting "unavailable".',
        e,
      );
      return 'unavailable';
    }
  }

  static async create(options: unknown): Promise<Classifier> {
    if (options === null || typeof options !== 'object') {
      throw new TypeError("Failed to execute 'create' on 'Classifier': parameter 1 is not a dictionary.");
    }
    const { monitor, signal } = options as { monitor?: unknown; signal?: unknown };
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("Failed to read the 'signal' property: The provided value is not an AbortSignal.");
    }
    if (monitor !== undefined && typeof monitor !== 'function') {
      throw new TypeError("Failed to read the 'monitor' property: The provided value is not a function.");
    }
    signal?.throwIfAborted();
    const schema = Classifier.toSchema(options);

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
        Classifier.rejectOnAbort(signal),
      ]);
      return new Classifier(CONSTRUCTOR_TOKEN, info);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        console.warn('[WebAI] Classifier polyfill: create() failed in the extension runtime.', e);
        throw new DOMException(`Classifier polyfill: ${e.message}`, 'InvalidStateError');
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

  async classify(input: unknown, options: unknown = {}): Promise<ClassifierResult> {
    this.assertAlive('classify');
    const { signal, classifyOptions } = Classifier.toClassifyOptions(options);
    signal?.throwIfAborted();

    const requestId = crypto.randomUUID();
    const onAbort = () => ClassifierPageBridge.abort(requestId);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await Promise.race([
        ClassifierPageBridge.request<ClassifierResult>(
          ClassifierRuntimeOp.CLASSIFY,
          { sessionId: this.sessionId, input: Classifier.toDomString(input), options: classifyOptions },
          { requestId, timeoutMs: CLASSIFY_TIMEOUT_MS },
        ),
        Classifier.rejectOnAbort(signal),
      ]);
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  async measureContextUsage(input: unknown, options: unknown = {}): Promise<number> {
    this.assertAlive('measureContextUsage');
    const { signal, classifyOptions } = Classifier.toClassifyOptions(options);
    signal?.throwIfAborted();
    return ClassifierPageBridge.request<number>(ClassifierRuntimeOp.MEASURE_CONTEXT_USAGE, {
      sessionId: this.sessionId,
      input: Classifier.toDomString(input),
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
        `Failed to execute '${method}' on 'Classifier': The classifier session has been destroyed.`,
        'InvalidStateError',
      );
    }
  }

  /** Keeps only the serializable dictionary members; the runtime validates them. */
  private static toSchema(options: unknown): ClassifierSchema {
    if (options === null || options === undefined) return {};
    if (typeof options !== 'object') {
      throw new TypeError("Failed to execute 'availability' on 'Classifier': parameter 1 is not a dictionary.");
    }
    const { context, expectedInputs, questions } = options as ClassifierSchema;
    return JSON.parse(JSON.stringify({ context, expectedInputs, questions }));
  }

  private static toClassifyOptions(options: unknown): {
    signal: AbortSignal | undefined;
    classifyOptions: ClassifierClassifyOptions;
  } {
    if (options === null || options === undefined) return { signal: undefined, classifyOptions: {} };
    if (typeof options !== 'object') {
      throw new TypeError("Failed to execute 'classify' on 'Classifier': parameter 2 is not a dictionary.");
    }
    const { signal, context } = options as { signal?: unknown; context?: unknown };
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("Failed to read the 'signal' property: The provided value is not an AbortSignal.");
    }
    const classifyOptions: ClassifierClassifyOptions = {};
    if (context !== undefined) classifyOptions.context = Classifier.toDomString(context);
    return { signal: signal as AbortSignal | undefined, classifyOptions };
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
