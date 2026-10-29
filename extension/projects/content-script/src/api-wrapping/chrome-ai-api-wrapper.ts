import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { ApiCallStage } from '../../../shared/enums/api-call-stage.enum';
import { RoutingResponseData } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageBridge } from '../../../shared/messaging/window-message-bridge';
import { PostMessageSanitizer } from '../../../shared/sanitization/post-message-sanitizer';
import { ApiStageEmitter } from './api-stage-emitter';
import { TrackedStreamHandler } from './tracked-stream-handler';

/**
 * Static methods (besides .create()) on Chrome AI API constructors that we
 * intercept for telemetry so page-level availability/feature probes are visible.
 */
const WRAPPED_STATIC_METHODS = ['availability', 'params'] as const;

/**
 * Methods on Chrome AI API instances that we explicitly intercept for telemetry.
 * All other methods are passed through to the original instance unchanged.
 */
const WRAPPED_INSTANCE_METHODS = [
  'prompt', 'promptStreaming', 'append',
  'summarize', 'summarizeStreaming',
  'translate', 'translateStreaming',
  'detect', 'write', 'writeStreaming',
  'rewrite', 'rewriteStreaming',
  'proofread', 'proofreadStreaming',
  'classify', 'decide', 'measureContextUsage',
  'clone', 'destroy',
] as const;

/**
 * APIs that are never routed to an external provider. The Decisions API is
 * served by the extension's own on-device polyfill, so the routing setting
 * (Gemini/OpenAI) does not apply to it.
 */
const LOCAL_ONLY_APIS: readonly string[] = ['DecisionModel', 'Classifier'];

/**
 * Methods available on mock instances returned when routing to an external provider.
 * Subset of WRAPPED_INSTANCE_METHODS (excludes clone/destroy which are handled separately).
 */
const MOCK_INSTANCE_METHODS = [
  'prompt', 'promptStreaming', 'append',
  'summarize', 'summarizeStreaming',
  'translate', 'translateStreaming',
  'detect', 'write', 'writeStreaming',
  'rewrite', 'rewriteStreaming',
  'proofread', 'proofreadStreaming',
] as const;

/**
 * Wraps a Chrome AI API (e.g., LanguageModel, Summarizer) to intercept
 * create() calls and proxy instance method invocations for telemetry and routing.
 *
 * Two code paths exist depending on the active provider setting:
 *
 * 1. **Chrome (on-device)**: The original .create() is called. The returned instance
 *    is wrapped in a Proxy that emits lifecycle stages for each method call.
 *
 * 2. **External provider (Gemini/OpenAI)**: A mock instance is returned that routes
 *    all method calls through the content script to the external API. The original
 *    Chrome AI API is never called.
 */
export class ChromeAiApiWrapper {
  private readonly emitter: ApiStageEmitter;
  private readonly streamHandler: TrackedStreamHandler;
  private originalCreate: Function | null = null;
  private readonly originalStaticMethods = new Map<string, Function>();

  constructor(private readonly apiName: string) {
    this.emitter = new ApiStageEmitter(apiName);
    this.streamHandler = new TrackedStreamHandler(this.emitter);
  }

  /**
   * Replaces static methods (.create(), .availability(), .params()) on the global
   * API object (e.g., window.LanguageModel) with instrumented versions.
   *
   * Does nothing if the API doesn't exist on window.
   */
  wrap(): void {
    if (typeof window === 'undefined' || !(this.apiName in window)) return;

    const apiObj = (window as any)[this.apiName];
    if (!apiObj || (typeof apiObj !== 'object' && typeof apiObj !== 'function')) return;

    for (const staticMethod of WRAPPED_STATIC_METHODS) {
      if (typeof apiObj[staticMethod] === 'function') {
        this.wrapStaticMethod(apiObj, staticMethod);
      }
    }

    if (typeof apiObj.create !== 'function') return;

    const originalCreate = apiObj.create;
    const wrapper = this;
    this.originalCreate = originalCreate;

    apiObj.create = async function (options?: unknown) {
      const callId = crypto.randomUUID();
      const sanitizedOptions = await PostMessageSanitizer.sanitize(options || {});
      wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.CREATE, { options: sanitizedOptions as any });

      try {
        // Check which provider is active before deciding the code path
        const routingResponse = await WindowMessageBridge.sendRequest<RoutingResponseData>(
          WindowMessageType.ROUTING_REQUEST,
          WindowMessageType.ROUTING_RESPONSE,
        );

        if (routingResponse.modelRouting !== 'chrome' && !LOCAL_ONLY_APIS.includes(wrapper.apiName)) {
          wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.COMPLETED);
          return wrapper.createMockInstance(callId);
        }

        // Chrome on-device path: call the real .create() and wrap the result
        let forwardedOptions = options;
        if (
          wrapper.apiName === 'LanguageModel' &&
          options &&
          typeof options === 'object' &&
          (options as Record<string, unknown>)['samplingMode'] !== undefined &&
          ('temperature' in (options as object) || 'topK' in (options as object))
        ) {
          const clonedOptions = { ...(options as Record<string, unknown>) };
          delete clonedOptions['temperature'];
          delete clonedOptions['topK'];
          forwardedOptions = clonedOptions;
        }
        const originalInstance = await originalCreate.call(this, forwardedOptions);
        wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.COMPLETED);
        return wrapper.createTrackedProxy(originalInstance, callId);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.ERROR, { errorMessage });
        throw err;
      }
    };
  }

  /**
   * Restores the original static methods (used when API wrapping is disabled in settings).
   */
  unwrap(): void {
    if (typeof window === 'undefined') return;
    const apiObj = (window as any)[this.apiName];
    if (apiObj) {
      if (this.originalCreate) {
        apiObj.create = this.originalCreate;
      }
      for (const [methodName, originalFn] of this.originalStaticMethods.entries()) {
        apiObj[methodName] = originalFn;
      }
    }
    this.originalCreate = null;
    this.originalStaticMethods.clear();
  }

  /**
   * Wraps a static method (such as availability() or params()) to emit
   * execute/completed/error telemetry stages without altering its behavior.
   */
  private wrapStaticMethod(apiObj: Record<string, any>, methodName: string): void {
    const originalFn = apiObj[methodName] as Function;
    const wrapper = this;
    this.originalStaticMethods.set(methodName, originalFn);

    apiObj[methodName] = async function (...args: unknown[]) {
      const callId = crypto.randomUUID();
      if (args.length > 0) {
        const sanitizedArgs = await PostMessageSanitizer.sanitize(args);
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.EXECUTE, {
          args: sanitizedArgs as any,
        });
      } else {
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.EXECUTE);
      }

      try {
        const res = await originalFn.apply(this, args);
        const sanitizedRes = await PostMessageSanitizer.sanitize(res);
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.COMPLETED, {
          response: sanitizedRes as any,
        });
        return res;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.ERROR, { errorMessage });
        throw err;
      }
    };
  }

  /**
   * Builds a mock instance that routes all method calls to an external provider
   * (Gemini or OpenAI) via window messages through the content script.
   *
   * Why a mock instead of the real instance: When the user selects an external
   * provider, we don't want to trigger Chrome's on-device model download or
   * initialization. The mock provides the same interface while forwarding
   * all actual work to the external API.
   */
  private createMockInstance(sessionCallId: string): Record<string, unknown> {
    const wrapper = this;
    const eventTarget = new EventTarget();
    let oncontextoverflowHandler: ((this: EventTarget, ev: Event) => unknown) | null = null;

    const mockInstance: Record<string, unknown> = {
      clone: async function () { return this; },
      destroy: function () {},
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
      contextUsage: 0,
      contextWindow: 0,
      measureContextUsage: async () => 0,
      measureInputUsage: async () => 0,
      get oncontextoverflow() {
        return oncontextoverflowHandler;
      },
      set oncontextoverflow(handler: ((this: EventTarget, ev: Event) => unknown) | null) {
        if (oncontextoverflowHandler) {
          eventTarget.removeEventListener('contextoverflow', oncontextoverflowHandler as EventListener);
        }
        oncontextoverflowHandler = typeof handler === 'function' ? handler : null;
        if (oncontextoverflowHandler) {
          eventTarget.addEventListener('contextoverflow', oncontextoverflowHandler as EventListener);
        }
      },
    };

    for (const methodName of MOCK_INSTANCE_METHODS) {
      if (methodName.endsWith('Streaming')) {
        mockInstance[methodName] = function (...args: unknown[]) {
          return wrapper.createMockStreamingMethod(sessionCallId, methodName, args);
        };
      } else {
        mockInstance[methodName] = async function (...args: unknown[]) {
          return wrapper.createMockNonStreamingMethod(sessionCallId, methodName, args);
        };
      }
    }

    return mockInstance;
  }

  /**
   * Creates a ReadableStream that sends the request to the external provider
   * and emits the response as a single chunk (external providers don't support
   * true streaming through our bridge).
   */
  private createMockStreamingMethod(
    sessionCallId: string,
    methodName: string,
    args: unknown[],
  ): ReadableStream {
    const methodCallId = crypto.randomUUID();
    const emitter = this.emitter;
    const apiName = this.apiName;

    // Fire-and-forget the execute stage emission (don't block the stream)
    PostMessageSanitizer.sanitize(args).then((sanitizedArgs) => {
      emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.EXECUTE, {
        args: sanitizedArgs as any,
      });
    });

    let accumulatedResponse = '';

    return new ReadableStream({
      async start(controller) {
        try {
          const sanitizedArgs = await PostMessageSanitizer.sanitize(args);

          const response = await WindowMessageBridge.sendRequest<string>(
            WindowMessageType.PROVIDER_REQUEST,
            WindowMessageType.PROVIDER_RESPONSE,
            { payload: { api: apiName, method: methodName, args: sanitizedArgs } },
          );

          emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.FIRST_TOKEN);
          accumulatedResponse = response;
          controller.enqueue(response);
          emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
            response: accumulatedResponse,
          });
          controller.close();
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.ERROR, { errorMessage });
          controller.error(err);
        }
      },
    });
  }

  /**
   * Sends a non-streaming request to the external provider and returns the result.
   */
  private async createMockNonStreamingMethod(
    sessionCallId: string,
    methodName: string,
    args: unknown[],
  ): Promise<unknown> {
    const methodCallId = crypto.randomUUID();

    const sanitizedArgs = await PostMessageSanitizer.sanitize(args);
    this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.EXECUTE, {
      args: sanitizedArgs as any,
    });

    try {
      const response = await WindowMessageBridge.sendRequest<string>(
        WindowMessageType.PROVIDER_REQUEST,
        WindowMessageType.PROVIDER_RESPONSE,
        { payload: { api: this.apiName, method: methodName, args: sanitizedArgs } },
      );

      PostMessageSanitizer.sanitize(response).then((sanitizedRes) => {
        this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
          response: sanitizedRes as any,
        });
      });

      return response;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.ERROR, { errorMessage });
      throw err;
    }
  }

  /**
   * Wraps a real Chrome AI API instance in a Proxy for telemetry.
   *
   * The Proxy intercepts property access: for methods in WRAPPED_INSTANCE_METHODS,
   * it returns an instrumented wrapper that emits lifecycle stages. All other
   * properties/methods are passed through unchanged.
   */
  private createTrackedProxy(originalInstance: unknown, sessionCallId: string): unknown {
    const wrapper = this;

    return new Proxy(originalInstance as object, {
      get(target, prop, _receiver) {
        const value = Reflect.get(target, prop, target);

        if (typeof value !== 'function') return value;
        if (prop === 'constructor') return value;
        if (typeof prop === 'string' && prop.startsWith('on')) {
          return value;
        }
        if (typeof prop === 'symbol') {
          return value.bind(target);
        }

        const methodName = prop;
        const shouldWrap = (WRAPPED_INSTANCE_METHODS as readonly string[]).includes(methodName);

        if (!shouldWrap) {
          return value.bind(target);
        }

        return function (...args: unknown[]) {
          return wrapper.invokeTrackedMethod(target, value, methodName, sessionCallId, args);
        };
      },
      set(target, prop, value) {
        return Reflect.set(target, prop, value, target);
      },
    });
  }

  /**
   * Invokes a method on the real Chrome AI instance while emitting telemetry
   * for each lifecycle stage.
   *
   * Handles three result types:
   * 1. Promise resolving to a ReadableStream (e.g., some APIs return promises that resolve to streams)
   * 2. Direct ReadableStream return (e.g., promptStreaming)
   * 3. Promise resolving to a non-stream value (e.g., prompt, summarize)
   * 4. Synchronous return
   */
  private invokeTrackedMethod(
    target: object,
    method: Function,
    methodName: string,
    sessionCallId: string,
    args: unknown[],
  ): unknown {
    const methodCallId = crypto.randomUUID();

    // Measure input length for telemetry
    let inputLength = 0;
    try {
      if (args.length > 0 && typeof args[0] === 'string') {
        inputLength = args[0].length;
      } else if (args.length > 0) {
        inputLength = JSON.stringify(args[0]).length;
      }
    } catch {
      // Input length is best-effort
    }

    // Emit execute stage asynchronously (sanitization may be slow for large inputs)
    PostMessageSanitizer.sanitize(args).then((sanitizedArgs) => {
      this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.EXECUTE, {
        args: sanitizedArgs as any,
        inputLength,
      });
    });

    // Attempt to measure token usage asynchronously if the API supports it
    const nonMeasuredMethods = ['measureContextUsage', 'measureInputUsage', 'clone', 'destroy'];
    if (!nonMeasuredMethods.includes(methodName)) {
      const measureFn =
        typeof (target as any).measureContextUsage === 'function'
          ? (target as any).measureContextUsage
          : typeof (target as any).measureInputUsage === 'function'
            ? (target as any).measureInputUsage
            : null;

      if (measureFn) {
        try {
          measureFn
            .apply(target, args)
            .then((usage: number) => {
              this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.INPUT_USAGE, {
                inputTokenCount: usage,
              });
            })
            .catch(() => {});
        } catch {
          // Token usage measurement is best-effort
        }
      }
    }

    try {
      const result = method.apply(target, args);

      // Promise-based result (most common)
      if (result && typeof result.then === 'function') {
        return result.then(async (res: unknown) => {
          if (res instanceof ReadableStream) {
            return this.streamHandler.wrap(res, methodCallId, sessionCallId, methodName);
          }

          const sanitizedRes = await PostMessageSanitizer.sanitize(res);
          this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
            response: sanitizedRes as any,
          });
          if (methodName === 'clone' && res && typeof res === 'object') {
            return this.createTrackedProxy(res, sessionCallId);
          }
          return res;
        }).catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.ERROR, { errorMessage });
          throw err;
        });
      }

      // Direct ReadableStream return (e.g., promptStreaming in some implementations)
      if (result instanceof ReadableStream) {
        return this.streamHandler.wrap(result, methodCallId, sessionCallId, methodName);
      }

      // Synchronous return
      PostMessageSanitizer.sanitize(result).then((sanitizedRes) => {
        this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
          response: sanitizedRes as any,
        });
      });
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.ERROR, { errorMessage });
      throw err;
    }
  }
}
