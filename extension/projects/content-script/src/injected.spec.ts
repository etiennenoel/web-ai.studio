import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('injected script', () => {
  beforeEach(() => {
    // Reset window state
    (window as any).webai = undefined;
    (window as any).LanguageModel = {
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockResolvedValue('Hello'),
        measureInputUsage: vi.fn().mockResolvedValue(5),
      })
    };
    (window as any).Summarizer = {
      create: vi.fn().mockResolvedValue({
        summarize: vi.fn().mockResolvedValue('Summary here'),
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // window.webai initialization
  // -------------------------------------------------------------------------

  it('should initialize window.webai with version and getHardwareInformation', async () => {
    await import('./injected');

    expect(window.webai).toBeDefined();
    expect(window.webai.version).toBeDefined();
    expect(typeof window.webai.getHardwareInformation).toBe('function');
  });

  it('should create history fetchers for all APIs', async () => {
    await import('./injected');

    expect(typeof window.webai.languageModel.getHistory).toBe('function');
    expect(typeof window.webai.summarizer.getHistory).toBe('function');
    expect(typeof window.webai.translator.getHistory).toBe('function');
    expect(typeof window.webai.languageDetector.getHistory).toBe('function');
    expect(typeof window.webai.writer.getHistory).toBe('function');
    expect(typeof window.webai.rewriter.getHistory).toBe('function');
    expect(typeof window.webai.proofreader.getHistory).toBe('function');
  });

  // -------------------------------------------------------------------------
  // API wrapping
  // -------------------------------------------------------------------------

  it('should wrap LanguageModel.create', async () => {
    const originalCreate = (window as any).LanguageModel.create;
    vi.resetModules();
    await import('./injected');

    // The create method should be overwritten
    expect((window as any).LanguageModel.create).not.toBe(originalCreate);
  });

  it('should wrap Summarizer.create', async () => {
    const originalCreate = (window as any).Summarizer.create;
    vi.resetModules();
    await import('./injected');

    expect((window as any).Summarizer.create).not.toBe(originalCreate);
  });

  it('should not wrap APIs that do not exist on window', async () => {
    // Writer is not defined
    delete (window as any).Writer;
    vi.resetModules();
    await import('./injected');

    expect((window as any).Writer).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // getHardwareInformation request/response pattern
  // -------------------------------------------------------------------------

  it('should send HW_INFO_REQUEST and resolve on response', async () => {
    await import('./injected');

    const postMessageSpy = vi.spyOn(window, 'postMessage');

    // Start the hardware info request
    const promise = window.webai.getHardwareInformation();

    // Find the posted message to get the messageId
    const sentMessage = postMessageSpy.mock.calls.find(
      (call: any) => call[0]?.type === 'WEBAI_HW_INFO_REQUEST'
    );
    expect(sentMessage).toBeDefined();
    const messageId = sentMessage![0].messageId;

    // Simulate response
    window.dispatchEvent(new MessageEvent('message', {
      source: window,
      data: {
        type: 'WEBAI_HW_INFO_RESPONSE',
        messageId,
        data: { cpu: 'test-cpu' }
      }
    }));

    const result = await promise;
    expect(result).toEqual({ cpu: 'test-cpu' });
  });

  it('should reject getHardwareInformation on error response', async () => {
    await import('./injected');

    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const promise = window.webai.getHardwareInformation();

    const sentMessage = postMessageSpy.mock.calls.find(
      (call: any) => call[0]?.type === 'WEBAI_HW_INFO_REQUEST'
    );
    const messageId = sentMessage![0].messageId;

    window.dispatchEvent(new MessageEvent('message', {
      source: window,
      data: {
        type: 'WEBAI_HW_INFO_RESPONSE',
        messageId,
        error: 'No GPU found'
      }
    }));

    await expect(promise).rejects.toThrow('No GPU found');
  });

  // -------------------------------------------------------------------------
  // History fetcher request/response pattern
  // -------------------------------------------------------------------------

  it('should send GET_HISTORY and resolve with history data', async () => {
    await import('./injected');

    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const promise = window.webai.languageModel.getHistory();

    const sentMessage = postMessageSpy.mock.calls.find(
      (call: any) => call[0]?.type === 'WEBAI_GET_HISTORY'
    );
    expect(sentMessage).toBeDefined();
    expect(sentMessage![0].payload.apiName).toBe('LanguageModel');
    const messageId = sentMessage![0].messageId;

    window.dispatchEvent(new MessageEvent('message', {
      source: window,
      data: {
        type: 'WEBAI_GET_HISTORY_RESPONSE',
        messageId,
        data: [{ id: 'call-1' }, { id: 'call-2' }]
      }
    }));

    const result = await promise;
    expect(result).toEqual([{ id: 'call-1' }, { id: 'call-2' }]);
  });

  // -------------------------------------------------------------------------
  // Diagnosis eval listener
  // -------------------------------------------------------------------------

  it('should respond to DIAGNOSIS_EVAL_REQUEST with API availability', async () => {
    await import('./injected');

    const postedMessages: any[] = [];
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any) => {
      postedMessages.push(msg);
    });

    // Simulate diagnosis request
    window.dispatchEvent(new MessageEvent('message', {
      source: window,
      data: {
        type: 'WEBAI_DIAGNOSIS_EVAL_REQUEST',
        messageId: 'diag-1'
      }
    }));

    // Allow event loop to process
    await new Promise(resolve => setTimeout(resolve, 0));

    const response = postedMessages.find(m => m.type === 'WEBAI_DIAGNOSIS_EVAL_RESPONSE');
    expect(response).toBeDefined();
    expect(response.messageId).toBe('diag-1');
    // LanguageModel and Summarizer are defined in beforeEach
    expect(response.data.LanguageModel).toBe(true);
    expect(response.data.Summarizer).toBe(true);
  });

  // -------------------------------------------------------------------------
  // API call stage emission
  // -------------------------------------------------------------------------

  it('should emit API_CALL create stage when wrapped create is called', async () => {
    vi.resetModules();

    // Set up routing to return chrome (so we use real create path)
    const origAddEventListener = window.addEventListener.bind(window);
    let routingListener: any;
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: any, ...rest: any[]) => {
      origAddEventListener(type, listener, ...rest);
    });

    const postedMessages: any[] = [];
    const origPostMessage = window.postMessage.bind(window);
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any, target: any) => {
      postedMessages.push(msg);
      // Auto-respond to routing requests with 'chrome'
      if (msg.type === 'WEBAI_ROUTING_REQUEST') {
        window.dispatchEvent(new MessageEvent('message', {
          source: window,
          data: {
            type: 'WEBAI_ROUTING_RESPONSE',
            messageId: msg.messageId,
            data: { modelRouting: 'chrome' }
          }
        }));
      }
    });

    await import('./injected');

    // Call the wrapped create
    await (window as any).LanguageModel.create({ temperature: 0.5 });

    // Should have emitted a create stage
    const createMsg = postedMessages.find(
      m => m.type === 'WEBAI_API_CALL' && m.payload?.stage === 'create'
    );
    expect(createMsg).toBeDefined();
    expect(createMsg.payload.api).toBe('LanguageModel');
    expect(createMsg.payload.method).toBe('create');
  });

  it('should wrap static availability() and emit execute + completed stages, and restore on unwrap', async () => {
    vi.resetModules();

    const availabilitySpy = vi.fn().mockResolvedValue('available');
    const createSpy = vi.fn().mockResolvedValue({});
    (window as any).LanguageModel = {
      availability: availabilitySpy,
      create: createSpy,
    };

    const postedMessages: any[] = [];
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any) => {
      postedMessages.push(msg);
    });

    await import('./injected');

    expect((window as any).LanguageModel.availability).not.toBe(availabilitySpy);

    const status = await (window as any).LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
    });
    expect(status).toBe('available');
    expect(availabilitySpy).toHaveBeenCalledWith({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
    });

    const executeMsg = postedMessages.find(
      (m) => m.type === 'WEBAI_API_CALL' && m.payload?.method === 'availability' && m.payload?.stage === 'execute',
    );
    const completedMsg = postedMessages.find(
      (m) => m.type === 'WEBAI_API_CALL' && m.payload?.method === 'availability' && m.payload?.stage === 'completed',
    );
    expect(executeMsg).toBeDefined();
    expect(executeMsg.payload.api).toBe('LanguageModel');
    expect(completedMsg).toBeDefined();
    expect(completedMsg.payload.response).toBe('available');

    // Pushing wrapApi: false should restore both create and availability
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          type: 'WEBAI_SETTINGS_PUSH',
          data: { wrapApi: false, classifierPolyfill: true },
        },
      }),
    );

    expect((window as any).LanguageModel.availability).toBe(availabilitySpy);
    expect((window as any).LanguageModel.create).toBe(createSpy);
  });

  it('should forward underlying target in Proxy set trap for brand-checked WebIDL setters like oncontextoverflow', async () => {
    vi.resetModules();

    let storedHandler: ((ev: Event) => void) | null = null;
    const nativeSession: any = {
      prompt: vi.fn().mockResolvedValue('Hello'),
      measureContextUsage: vi.fn().mockResolvedValue(7),
    };

    Object.defineProperty(nativeSession, 'oncontextoverflow', {
      get() {
        if (this !== nativeSession) {
          throw new TypeError('Illegal invocation');
        }
        return storedHandler;
      },
      set(val) {
        if (this !== nativeSession) {
          throw new TypeError('Illegal invocation');
        }
        storedHandler = typeof val === 'function' ? val : null;
      },
      configurable: true,
    });

    const clonedNativeSession: any = {
      prompt: vi.fn().mockResolvedValue('Cloned hello'),
      measureContextUsage: vi.fn().mockResolvedValue(4),
    };
    let clonedStoredHandler: ((ev: Event) => void) | null = null;
    Object.defineProperty(clonedNativeSession, 'oncontextoverflow', {
      get() {
        if (this !== clonedNativeSession) {
          throw new TypeError('Illegal invocation');
        }
        return clonedStoredHandler;
      },
      set(val) {
        if (this !== clonedNativeSession) {
          throw new TypeError('Illegal invocation');
        }
        clonedStoredHandler = typeof val === 'function' ? val : null;
      },
      configurable: true,
    });
    nativeSession.clone = vi.fn().mockResolvedValue(clonedNativeSession);

    const createSpy = vi.fn().mockResolvedValue(nativeSession);
    (window as any).LanguageModel = { create: createSpy };

    const postedMessages: any[] = [];
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any) => {
      postedMessages.push(msg);
      if (msg.type === 'WEBAI_ROUTING_REQUEST') {
        window.dispatchEvent(new MessageEvent('message', {
          source: window,
          data: {
            type: 'WEBAI_ROUTING_RESPONSE',
            messageId: msg.messageId,
            data: { modelRouting: 'chrome' },
          },
        }));
      }
    });

    await import('./injected');

    const session = await (window as any).LanguageModel.create({
      samplingMode: 'most-predictable',
      temperature: 0,
      topK: 1,
    });

    // Should strip temperature and topK when samplingMode is present
    expect(createSpy).toHaveBeenCalledWith({ samplingMode: 'most-predictable' });

    const handler = vi.fn();
    // Chained assignment testing both legacy expando property and native WebIDL setter
    expect(() => {
      session.onquotaoverflow = session.oncontextoverflow = handler;
    }).not.toThrow();

    expect(storedHandler).toBe(handler);
    expect(session.oncontextoverflow).toBe(handler);

    // Calling prompt should measure token usage via measureContextUsage
    await session.prompt('test prompt');
    expect(nativeSession.measureContextUsage).toHaveBeenCalledWith('test prompt');

    // Cloned session should also be wrapped in a Proxy with working set trap and telemetry
    const cloned = await session.clone();
    const clonedHandler = vi.fn();
    expect(() => {
      cloned.oncontextoverflow = clonedHandler;
    }).not.toThrow();
    expect(clonedStoredHandler).toBe(clonedHandler);

    await cloned.prompt('cloned prompt');
    expect(clonedNativeSession.measureContextUsage).toHaveBeenCalledWith('cloned prompt');
  });

  it('should not overwrite native window.DecisionModel when already defined', async () => {
    const { ClassifierPolyfillInstaller } = await import('./polyfill/classifier-polyfill.installer');
    ClassifierPolyfillInstaller.uninstall();
    const nativeDecisionModel = { create: vi.fn(), availability: vi.fn() };
    (window as any).DecisionModel = nativeDecisionModel;
    delete (window as any).Classifier;

    const installed = ClassifierPolyfillInstaller.install();
    expect(installed).toBe(false);
    expect((window as any).DecisionModel).toBe(nativeDecisionModel);
  });

  it('should support monitor.ondownloadprogress property handler and EventTarget inheritance on DecisionModel polyfill', async () => {
    const { DecisionModel } = await import('./polyfill/classifier.polyfill');
    const { ClassifierPageBridge } = await import('./polyfill/classifier-page-bridge');

    vi.spyOn(ClassifierPageBridge, 'request').mockImplementation(async (_op, _payload, options) => {
      options?.onProgress?.(0.5);
      options?.onProgress?.(1.0);
      return { sessionId: 's1', contextWindow: 256, contextUsage: 12 } as any;
    });

    const progressEvents: number[] = [];
    const session = await DecisionModel.create({
      questions: [{ id: 'q1', type: 'boolean', prompt: 'Is urgent?' }],
      monitor(m: any) {
        m.ondownloadprogress = (ev: ProgressEvent) => {
          progressEvents.push(ev.loaded);
        };
      },
    });

    expect(progressEvents).toEqual([0.5, 1.0]);
    expect(session).toBeInstanceOf(EventTarget);
  });
});
