import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { ApiCallStage } from '../../../shared/enums/api-call-stage.enum';
import { WindowMessageBridge } from '../../../shared/messaging/window-message-bridge';
import { PostMessageSanitizer } from '../../../shared/sanitization/post-message-sanitizer';
import { ApiStageEmitter } from './api-stage-emitter';
import { TrackedStreamHandler } from './tracked-stream-handler';

/**
 * Static methods (besides .create()) on Chrome AI API constructors that we
 * intercept for telemetry so page-level availability/feature probes are visible.
 */
const WRAPPED_STATIC_METHODS = ['availability', 'params', 'capabilities'] as const;

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
  'decide', 'measureContextUsage', 'measureInputUsage',
  'clone', 'destroy',
] as const;

/**
 * APIs that are never routed to an external provider. The Decisions API is
 * served by the extension's own on-device polyfill, so the routing setting
 * (Gemini/OpenAI) does not apply to it.
 */
const LOCAL_ONLY_APIS: readonly string[] = ['DecisionModel'];

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

const CHROME_EXT_ORIGIN_RE = /chrome-extension:\/\/[a-z]{32}/g;
const PAGE_SCRIPT_SCHEME_RE = /(?:https?|file|blob):\/\//i;

/**
 * Wraps an existing Chrome AI API global (e.g., `window.LanguageModel`, `window.Summarizer`)
 * to intercept static probes (`.availability()`, `.params()`, `.capabilities()`), `.create()`,
 * and instance method invocations for telemetry and optional provider routing.
 */
export class ChromeAiApiWrapper {
  private readonly emitter: ApiStageEmitter;
  private readonly streamHandler: TrackedStreamHandler;
  private wrappedTarget: Record<string, any> | null = null;
  private originalCreate: Function | null = null;
  private readonly originalStaticMethods = new Map<string, Function>();
  private wrapped = false;

  constructor(
    private readonly apiName: string,
    private readonly getActiveProviderId: () => string = () => 'chrome',
    private readonly ownExtensionOrigin: string | null = null,
  ) {
    this.emitter = new ApiStageEmitter(apiName);
    this.streamHandler = new TrackedStreamHandler(this.emitter);
  }

  /**
   * Returns true only when the given Built-in AI global actually exists on `window`.
   */
  static isApiPresent(apiName: string): boolean {
    if (typeof window === 'undefined' || !(apiName in window)) return false;
    const apiObj = (window as any)[apiName];
    return Boolean(apiObj && (typeof apiObj === 'object' || typeof apiObj === 'function'));
  }

  get isWrapped(): boolean {
    return this.wrapped;
  }

  /**
   * Replaces static methods (`.create()`, `.availability()`, `.params()`, `.capabilities()`)
   * on the global API object with instrumented versions.
   *
   * Idempotent and does nothing if the API does not exist on `window`.
   */
  wrap(): void {
    if (this.wrapped) return;
    if (!ChromeAiApiWrapper.isApiPresent(this.apiName)) return;

    const apiObj = (window as any)[this.apiName] as Record<string, any>;
    this.wrappedTarget = apiObj;

    for (const staticMethod of WRAPPED_STATIC_METHODS) {
      if (typeof apiObj[staticMethod] === 'function') {
        this.wrapStaticMethod(apiObj, staticMethod);
      }
    }

    if (typeof apiObj['create'] === 'function') {
      const originalCreate = apiObj['create'] as Function;
      const wrapper = this;
      this.originalCreate = originalCreate;

      apiObj['create'] = async function (this: unknown, options?: unknown) {
        const receiver = this === undefined || this === null || this === window ? apiObj : this;

        if (wrapper.isExternalExtensionCall()) {
          return originalCreate.call(receiver, options);
        }

        const createTimestamp = Date.now();
        const callId = crypto.randomUUID();
        const activeProvider = wrapper.getActiveProviderId() || 'chrome';

        // External provider routing path (Gemini / OpenAI)
        if (activeProvider !== 'chrome' && !LOCAL_ONLY_APIS.includes(wrapper.apiName)) {
          const sanitizedOptions = await PostMessageSanitizer.sanitize(options || {}).catch(() => ({}));
          wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.CREATE, {
            timestamp: createTimestamp,
            options: sanitizedOptions as any,
          });
          wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.COMPLETED);
          return wrapper.createMockInstance(callId);
        }

        // Chrome on-device path: invoke originalCreate SYNCHRONOUSLY before awaiting
        // sanitization so transient user activation (model downloads) and monitor(m)
        // execute on the caller's synchronous turn.
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

        let createPromise: Promise<unknown>;
        try {
          createPromise = Promise.resolve(originalCreate.call(receiver, forwardedOptions));
        } catch (syncErr) {
          createPromise = Promise.reject(syncErr);
        }
        // Prevent interim unhandled-rejection noise while options finish sanitizing
        createPromise.catch(() => {});

        const sanitizedOptions = await PostMessageSanitizer.sanitize(options || {}).catch(() => ({}));
        wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.CREATE, {
          timestamp: createTimestamp,
          options: sanitizedOptions as any,
        });

        try {
          const originalInstance = await createPromise;
          wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.COMPLETED);
          return wrapper.createTrackedProxy(originalInstance, callId);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          wrapper.emitter.emit(callId, callId, 'create', ApiCallStage.ERROR, { errorMessage });
          throw err;
        }
      };
    }

    this.wrapped = this.originalCreate !== null || this.originalStaticMethods.size > 0;
  }

  /**
   * Restores the original static methods (used when API wrapping is disabled in settings
   * or when a polyfilled API is uninstalled).
   */
  unwrap(): void {
    if (!this.wrapped) return;
    const target =
      this.wrappedTarget ?? (typeof window !== 'undefined' ? (window as any)[this.apiName] : null);
    if (target) {
      if (this.originalCreate) {
        target['create'] = this.originalCreate;
      }
      for (const [methodName, originalFn] of this.originalStaticMethods.entries()) {
        target[methodName] = originalFn;
      }
    }
    this.wrappedTarget = null;
    this.originalCreate = null;
    this.originalStaticMethods.clear();
    this.wrapped = false;
  }

  /**
   * Detects calls initiated purely by another third-party Chrome extension executing in
   * the page's MAIN world (contains a foreign `chrome-extension://` frame and zero
   * page-origin `http(s):` / `file:` / `blob:` script frames).
   */
  private isExternalExtensionCall(): boolean {
    const stack = new Error().stack;
    if (!stack || !stack.includes('chrome-extension://')) return false;

    const extOrigins = stack.match(CHROME_EXT_ORIGIN_RE);
    if (!extOrigins || extOrigins.length === 0) return false;

    const hasForeignExtension = extOrigins.some((origin) => origin !== this.ownExtensionOrigin);
    if (!hasForeignExtension) return false;

    return !PAGE_SCRIPT_SCHEME_RE.test(stack);
  }

  /**
   * Wraps a static method (such as `availability()`, `params()`, or `capabilities()`)
   * to emit execute/completed/error telemetry stages without altering its behavior.
   */
  private wrapStaticMethod(apiObj: Record<string, any>, methodName: string): void {
    const originalFn = apiObj[methodName] as Function;
    const wrapper = this;
    this.originalStaticMethods.set(methodName, originalFn);

    apiObj[methodName] = async function (this: unknown, ...args: unknown[]) {
      const receiver = this === undefined || this === null || this === window ? apiObj : this;

      if (wrapper.isExternalExtensionCall()) {
        return originalFn.apply(receiver, args);
      }

      const executeTimestamp = Date.now();
      const callId = crypto.randomUUID();

      let resultPromise: Promise<unknown>;
      try {
        resultPromise = Promise.resolve(originalFn.apply(receiver, args));
      } catch (syncErr) {
        resultPromise = Promise.reject(syncErr);
      }
      resultPromise.catch(() => {});

      if (args.length > 0) {
        const sanitizedArgs = await PostMessageSanitizer.sanitize(args).catch(() => []);
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.EXECUTE, {
          timestamp: executeTimestamp,
          args: sanitizedArgs as any,
        });
      } else {
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.EXECUTE, {
          timestamp: executeTimestamp,
        });
      }

      try {
        const res = await resultPromise;
        const completedTimestamp = Date.now();
        const sanitizedRes = await PostMessageSanitizer.sanitize(res).catch(() => undefined);
        wrapper.emitter.emit(callId, callId, methodName, ApiCallStage.COMPLETED, {
          timestamp: completedTimestamp,
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
   * and emits the response as a single chunk.
   */
  private createMockStreamingMethod(
    sessionCallId: string,
    methodName: string,
    args: unknown[],
  ): ReadableStream {
    const methodCallId = crypto.randomUUID();
    const executeTimestamp = Date.now();
    const emitter = this.emitter;
    const apiName = this.apiName;

    PostMessageSanitizer.sanitize(args)
      .catch(() => [])
      .then((sanitizedArgs) => {
        emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.EXECUTE, {
          timestamp: executeTimestamp,
          args: sanitizedArgs as any,
        });
      });

    let accumulatedResponse = '';

    return new ReadableStream({
      async start(controller) {
        try {
          const sanitizedArgs = await PostMessageSanitizer.sanitize(args).catch(() => []);

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
    const executeTimestamp = Date.now();

    const sanitizedArgs = await PostMessageSanitizer.sanitize(args).catch(() => []);
    this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.EXECUTE, {
      timestamp: executeTimestamp,
      args: sanitizedArgs as any,
    });

    try {
      const response = await WindowMessageBridge.sendRequest<string>(
        WindowMessageType.PROVIDER_REQUEST,
        WindowMessageType.PROVIDER_RESPONSE,
        { payload: { api: this.apiName, method: methodName, args: sanitizedArgs } },
      );

      const completedTimestamp = Date.now();
      PostMessageSanitizer.sanitize(response)
        .catch(() => undefined)
        .then((sanitizedRes) => {
          this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
            timestamp: completedTimestamp,
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
   */
  private createTrackedProxy(originalInstance: unknown, sessionCallId: string): unknown {
    if (!originalInstance || (typeof originalInstance !== 'object' && typeof originalInstance !== 'function')) {
      return originalInstance;
    }
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
   */
  private invokeTrackedMethod(
    target: object,
    method: Function,
    methodName: string,
    sessionCallId: string,
    args: unknown[],
  ): unknown {
    if (this.isExternalExtensionCall()) {
      return method.apply(target, args);
    }

    const methodCallId = crypto.randomUUID();
    const executeTimestamp = Date.now();

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
    PostMessageSanitizer.sanitize(args)
      .catch(() => [])
      .then((sanitizedArgs) => {
        this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.EXECUTE, {
          timestamp: executeTimestamp,
          args: sanitizedArgs as any,
          inputLength,
        });
      });

    // Attempt to measure token usage asynchronously if the API supports it natively
    const nonMeasuredMethods = ['measureContextUsage', 'measureInputUsage', 'clone', 'destroy'];
    if (!nonMeasuredMethods.includes(methodName) && !LOCAL_ONLY_APIS.includes(this.apiName)) {
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
        return result
          .then(async (res: unknown) => {
            if (res instanceof ReadableStream) {
              return this.streamHandler.wrap(res, methodCallId, sessionCallId, methodName);
            }

            const completedTimestamp = Date.now();
            const sanitizedRes = await PostMessageSanitizer.sanitize(res).catch(() => undefined);
            this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
              timestamp: completedTimestamp,
              response: sanitizedRes as any,
            });
            if (methodName === 'clone' && res && typeof res === 'object') {
              return this.createTrackedProxy(res, sessionCallId);
            }
            return res;
          })
          .catch((err: unknown) => {
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
      const completedTimestamp = Date.now();
      PostMessageSanitizer.sanitize(result)
        .catch(() => undefined)
        .then((sanitizedRes) => {
          this.emitter.emit(methodCallId, sessionCallId, methodName, ApiCallStage.COMPLETED, {
            timestamp: completedTimestamp,
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
