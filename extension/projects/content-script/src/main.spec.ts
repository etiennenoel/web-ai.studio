import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('content-script main', () => {
  let mockChrome: any;
  let injectedScript: HTMLScriptElement | null;

  beforeEach(() => {
    mockChrome = {
      runtime: {
        sendMessage: vi.fn(),
        getURL: vi.fn().mockReturnValue('chrome-extension://mock-id/injected.js'),
        lastError: null,
      }
    };
    (global as any).chrome = mockChrome;
    
    // Clear head
    document.head.innerHTML = '';
    injectedScript = null;
    
    // Mock for addEventListener
    vi.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).chrome;
    vi.resetModules();
  });

  it('should inject the script if wrap_api is true', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting' && req.key === 'wrap_api') {
        cb({ value: true });
      }
    });

    await import('./main');
    
    // Check if script was injected
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
    
    // Check if script was injected
    const scripts = document.head.getElementsByTagName('script');
    expect(scripts.length).toBe(0);
  });

  it('should forward WEBAI_API_CALL to background', async () => {
    mockChrome.runtime.sendMessage.mockImplementation((req: any, cb: Function) => {
      if (req.action === 'get_setting') cb({ value: false });
    });

    await import('./main');
    
    // Get the registered message listener
    const listenerArgs = (window.addEventListener as any).mock.calls.find((args: any) => args[0] === 'message');
    expect(listenerArgs).toBeDefined();
    const messageListener = listenerArgs[1];

    const mockPayload = { id: '123' };
    
    // Trigger message event
    await messageListener({
      source: window,
      data: {
        type: 'WEBAI_API_CALL',
        payload: mockPayload
      }
    });

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'log_api_call', payload: mockPayload },
      expect.any(Function)
    );
  });
});
