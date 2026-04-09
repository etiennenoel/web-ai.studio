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
});
