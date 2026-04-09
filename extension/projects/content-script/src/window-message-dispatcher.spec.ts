import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WindowMessageDispatcher } from './window-message-dispatcher';
import { WindowMessageType } from '../../shared/enums/window-message-type.enum';

// Mock chrome.runtime.sendMessage used by several handlers
const mockChrome = {
  runtime: {
    sendMessage: vi.fn((_msg: any, cb: any) => cb && cb({})),
  },
};
(globalThis as any).chrome = mockChrome;

/**
 * Helper to create a MessageEvent-like object from this window.
 */
function createWindowMessage(data: any): MessageEvent {
  return { source: window, data } as unknown as MessageEvent;
}

describe('WindowMessageDispatcher', () => {
  let dispatcher: WindowMessageDispatcher;

  beforeEach(() => {
    vi.clearAllMocks();
    dispatcher = new WindowMessageDispatcher();
  });

  it('should ignore messages from other sources', () => {
    const event = { source: null, data: { type: WindowMessageType.API_CALL } } as unknown as MessageEvent;
    // Should not throw
    dispatcher.dispatch(event);
  });

  it('should ignore messages without a type field', () => {
    const event = createWindowMessage({ foo: 'bar' });
    dispatcher.dispatch(event);
  });

  it('should forward API_CALL to the service worker', () => {
    const payload = { id: 'call-1', api: 'LanguageModel', stage: 'create' };
    const event = createWindowMessage({
      type: WindowMessageType.API_CALL,
      payload,
    });

    dispatcher.dispatch(event);

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'log_api_call', payload }),
      expect.any(Function),
    );
  });

  it('should handle HW_INFO_REQUEST without crashing', () => {
    // HwInfoHandler tries to query WebGL/WebGPU/navigator then calls
    // chrome.runtime.sendMessage. In a JSDOM environment, canvas contexts
    // are null but the handler shouldn't throw.
    const event = createWindowMessage({
      type: WindowMessageType.HW_INFO_REQUEST,
      messageId: 'msg-1',
    });

    expect(() => dispatcher.dispatch(event)).not.toThrow();
  });

  it('should handle ROUTING_REQUEST by querying settings', () => {
    mockChrome.runtime.sendMessage.mockImplementation((_msg: any, cb: any) => {
      cb({ value: 'provider-123' });
    });

    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const event = createWindowMessage({
      type: WindowMessageType.ROUTING_REQUEST,
      messageId: 'msg-2',
    });

    dispatcher.dispatch(event);

    // Should query the activeProviderId setting from the service worker
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'get_setting', key: 'activeProviderId' }),
      expect.any(Function),
    );

    postMessageSpy.mockRestore();
  });

  it('should handle GET_HISTORY_REQUEST by forwarding to service worker', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const event = createWindowMessage({
      type: WindowMessageType.GET_HISTORY_REQUEST,
      messageId: 'msg-3',
      payload: { origin: 'http://test.com', apiName: 'all' },
    });

    dispatcher.dispatch(event);

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'get_api_history' }),
      expect.any(Function),
    );

    postMessageSpy.mockRestore();
  });

  it('should not dispatch response-type messages to handlers', () => {
    const responseTypes = [
      WindowMessageType.HW_INFO_RESPONSE,
      WindowMessageType.DIAGNOSIS_EVAL_REQUEST,
      WindowMessageType.DIAGNOSIS_EVAL_RESPONSE,
      WindowMessageType.GET_HISTORY_RESPONSE,
      WindowMessageType.ROUTING_RESPONSE,
      WindowMessageType.PROVIDER_RESPONSE,
    ];

    for (const type of responseTypes) {
      mockChrome.runtime.sendMessage.mockClear();
      const event = createWindowMessage({ type, messageId: 'msg-x' });
      dispatcher.dispatch(event);
      // Response types should not trigger any chrome.runtime.sendMessage calls
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
    }
  });
});
