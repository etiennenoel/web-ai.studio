import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('content-script main', () => {
  let mockChrome: any;

  beforeEach(() => {
    mockChrome = {
      runtime: {
        sendMessage: vi.fn(),
        getURL: vi.fn().mockReturnValue('chrome-extension://mock-id/injected.js'),
        lastError: null,
        onMessage: {
          addListener: vi.fn()
        }
      }
    };
    (global as any).chrome = mockChrome;

    // Clear head
    document.head.innerHTML = '';

    // Mock for addEventListener
    vi.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).chrome;
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // Script injection
  // -------------------------------------------------------------------------

  it('should inject the script if wrap_api is true', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting' && req.key === 'wrap_api') {
        cb({ value: true });
      }
    });

    await import('./main');

    const scripts = document.head.getElementsByTagName('script');
    expect(scripts.length).toBe(1);
    expect(scripts[0].src).toBe('chrome-extension://mock-id/injected.js');
  });

  it('should not inject the script if wrap_api is false', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting' && req.key === 'wrap_api') {
        cb({ value: false });
      }
    });

    await import('./main');

    const scripts = document.head.getElementsByTagName('script');
    expect(scripts.length).toBe(0);
  });

  it('should inject script when setting response is undefined (defaults to true)', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') {
        cb({}); // No value property
      }
    });

    await import('./main');

    const scripts = document.head.getElementsByTagName('script');
    expect(scripts.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // WEBAI_API_CALL forwarding
  // -------------------------------------------------------------------------

  it('should forward WEBAI_API_CALL to background', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') cb({ value: false });
      if (req.action === 'log_api_call' && cb) cb({ success: true });
    });

    await import('./main');

    const listenerArgs = (window.addEventListener as any).mock.calls.find(
      (args: any) => args[0] === 'message'
    );
    expect(listenerArgs).toBeDefined();
    const messageListener = listenerArgs[1];

    const mockPayload = { id: '123', api: 'LanguageModel', stage: 'create' };

    await messageListener({
      source: window,
      data: { type: 'WEBAI_API_CALL', payload: mockPayload }
    });

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'log_api_call', payload: mockPayload },
      expect.any(Function)
    );
  });

  // -------------------------------------------------------------------------
  // WEBAI_HW_INFO_REQUEST handling
  // -------------------------------------------------------------------------

  it('should collect hardware info and forward to service worker', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') cb({ value: false });
      if (req.action === 'getHardwareInformation') {
        cb({ cpu: { archName: 'x86' }, memory: { capacity: 16000 } });
      }
    });

    await import('./main');

    const listenerArgs = (window.addEventListener as any).mock.calls.find(
      (args: any) => args[0] === 'message'
    );
    const messageListener = listenerArgs[1];

    const postedMessages: any[] = [];
    const origPostMessage = window.postMessage.bind(window);
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any) => {
      postedMessages.push(msg);
    });

    await messageListener({
      source: window,
      data: { type: 'WEBAI_HW_INFO_REQUEST', messageId: 'hw-1' }
    });

    // Should have posted a response with hardware info
    const response = postedMessages.find(m => m.type === 'WEBAI_HW_INFO_RESPONSE');
    expect(response).toBeDefined();
    expect(response.messageId).toBe('hw-1');
    expect(response.data).toBeDefined();
    expect(response.data.cpu).toEqual({ archName: 'x86' });
  });

  // -------------------------------------------------------------------------
  // WEBAI_ROUTING_REQUEST handling
  // -------------------------------------------------------------------------

  it('should return routing provider setting', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting' && req.key === 'wrap_api') cb({ value: false });
      if (req.action === 'get_setting' && req.key === 'activeProviderId') cb({ value: 'gemini' });
    });

    await import('./main');

    const listenerArgs = (window.addEventListener as any).mock.calls.find(
      (args: any) => args[0] === 'message'
    );
    const messageListener = listenerArgs[1];

    const postedMessages: any[] = [];
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any) => {
      postedMessages.push(msg);
    });

    await messageListener({
      source: window,
      data: { type: 'WEBAI_ROUTING_REQUEST', messageId: 'route-1' }
    });

    const response = postedMessages.find(m => m.type === 'WEBAI_ROUTING_RESPONSE');
    expect(response).toBeDefined();
    expect(response.data.modelRouting).toBe('gemini');
  });

  // -------------------------------------------------------------------------
  // WEBAI_GET_HISTORY forwarding
  // -------------------------------------------------------------------------

  it('should forward history request to service worker and relay response', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') cb({ value: false });
      if (req.action === 'get_api_history') cb({ data: [{ id: 'h1' }] });
    });

    await import('./main');

    const listenerArgs = (window.addEventListener as any).mock.calls.find(
      (args: any) => args[0] === 'message'
    );
    const messageListener = listenerArgs[1];

    const postedMessages: any[] = [];
    vi.spyOn(window, 'postMessage').mockImplementation((msg: any) => {
      postedMessages.push(msg);
    });

    await messageListener({
      source: window,
      data: {
        type: 'WEBAI_GET_HISTORY',
        messageId: 'hist-1',
        payload: { apiName: 'Summarizer', origin: 'http://test.com' }
      }
    });

    const response = postedMessages.find(m => m.type === 'WEBAI_GET_HISTORY_RESPONSE');
    expect(response).toBeDefined();
    expect(response.messageId).toBe('hist-1');
    expect(response.data).toEqual([{ id: 'h1' }]);
  });

  // -------------------------------------------------------------------------
  // diagnose_apis from chrome.runtime.onMessage
  // -------------------------------------------------------------------------

  it('should register a chrome.runtime.onMessage listener for diagnose_apis', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') cb({ value: false });
    });

    await import('./main');

    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Ignores messages from other sources
  // -------------------------------------------------------------------------

  it('should ignore messages from other sources', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') cb({ value: false });
    });

    await import('./main');

    const listenerArgs = (window.addEventListener as any).mock.calls.find(
      (args: any) => args[0] === 'message'
    );
    const messageListener = listenerArgs[1];

    // Source is not window
    await messageListener({
      source: null,
      data: { type: 'WEBAI_API_CALL', payload: { id: 'should-not-forward' } }
    });

    // Should NOT have forwarded
    const logCalls = mockChrome.runtime.sendMessage.mock.calls.filter(
      (call: any) => call[0]?.action === 'log_api_call'
    );
    expect(logCalls.length).toBe(0);
  });
});
