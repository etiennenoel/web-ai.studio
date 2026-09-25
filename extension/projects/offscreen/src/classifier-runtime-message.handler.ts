import { ClassifierEngine } from './classifier-engine';
import { ClassifierProgressEmitter } from './classifier-progress.emitter';
import { ClassifierRuntimeOp } from '../../base/src/lib/classifier/enums/classifier-runtime-op.enum';
import { ClassifierRuntimeRequest } from '../../base/src/lib/classifier/interfaces/classifier-runtime-request.interface';
import { ClassifierRuntimeResponse } from '../../base/src/lib/classifier/interfaces/classifier-runtime-response.interface';
import { serializeClassifierError } from '../../base/src/lib/classifier/messaging/classifier-error.utils';
import { ClassifierClassifyOptions } from '../../base/src/lib/classifier/interfaces/classifier-classify-options.interface';

/** Dispatches offscreen runtime requests to the engine and tracks abortable requests. */
export class ClassifierRuntimeMessageHandler {
  private readonly inflight = new Map<string, AbortController>();

  constructor(private readonly engine: ClassifierEngine) {}

  async handle(request: ClassifierRuntimeRequest): Promise<ClassifierRuntimeResponse> {
    try {
      return { ok: true, value: await this.dispatch(request) };
    } catch (e) {
      return { ok: false, error: serializeClassifierError(e) };
    }
  }

  private async dispatch(request: ClassifierRuntimeRequest): Promise<unknown> {
    const payload = (request.payload ?? {}) as Record<string, any>;
    switch (request.op) {
      case ClassifierRuntimeOp.PING:
        return 'pong';

      case ClassifierRuntimeOp.AVAILABILITY:
        return this.engine.availability(payload['schema']);

      case ClassifierRuntimeOp.CREATE:
        return this.abortable(request, (signal) => {
          const emitter = new ClassifierProgressEmitter(request.requestId, request.clientTabId);
          return this.engine.create(payload['schema'], (loaded) => emitter.emit(loaded), signal);
        });

      case ClassifierRuntimeOp.CLASSIFY:
        return this.abortable(request, (signal) =>
          this.engine.classify(
            payload['sessionId'],
            payload['input'],
            payload['options'] as ClassifierClassifyOptions | undefined,
            signal,
          ),
        );

      case ClassifierRuntimeOp.MEASURE_CONTEXT_USAGE:
        return this.engine.measureContextUsage(
          payload['sessionId'],
          payload['input'],
          payload['options'] as ClassifierClassifyOptions | undefined,
        );

      case ClassifierRuntimeOp.DESTROY:
        this.engine.destroy(payload['sessionId']);
        return undefined;

      case ClassifierRuntimeOp.ABORT:
        this.inflight.get(payload['requestId'])?.abort(new DOMException('The operation was aborted.', 'AbortError'));
        return undefined;

      case ClassifierRuntimeOp.LIST_MODELS:
        return this.engine.listModels();

      case ClassifierRuntimeOp.DOWNLOAD_MODEL:
        return this.abortable(request, (signal) => {
          const emitter = new ClassifierProgressEmitter(request.requestId, request.clientTabId, payload['variantId']);
          return this.engine.downloadModel(payload['variantId'], (loaded) => emitter.emit(loaded), signal);
        });

      case ClassifierRuntimeOp.DELETE_MODEL:
        return this.engine.deleteModel(payload['variantId']);

      case ClassifierRuntimeOp.UNLOAD_MODEL:
        this.engine.unloadModel();
        return undefined;

      default: {
        const _exhaustive: never = request.op;
        void _exhaustive;
        throw new DOMException(`Unknown classifier runtime op "${String(request.op)}".`, 'NotSupportedError');
      }
    }
  }

  private async abortable<T>(request: ClassifierRuntimeRequest, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    this.inflight.set(request.requestId, controller);
    try {
      return await work(controller.signal);
    } finally {
      this.inflight.delete(request.requestId);
    }
  }
}
