import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from './db';

vi.mock('./db', () => ({
  db: {
    saveCall: vi.fn().mockResolvedValue(undefined),
    getAllHistory: vi.fn().mockResolvedValue([]),
    getHistoryItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
    getHistory: vi.fn().mockResolvedValue([]),
    clearHistory: vi.fn().mockResolvedValue(undefined),
    clearAllHistory: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(true),
    setSetting: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('service-worker main', () => {
  let mockChrome: any;

  beforeEach(() => {
    mockChrome = {
      action: {
        onClicked: { addListener: vi.fn() }
      },
      sidePanel: { open: vi.fn() },
      runtime: {
        OnInstalledReason: { INSTALL: 'install', UPDATE: 'update' },
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        getManifest: vi.fn().mockReturnValue({ version: '1.0.0' }),
      },
      tabs: { create: vi.fn() },
      system: {
        cpu: { getInfo: vi.fn((cb: Function) => cb({ archName: 'x86_64', numOfProcessors: 8 })) },
        memory: { getInfo: vi.fn((cb: Function) => cb({ capacity: 16000000000, availableCapacity: 8000000000 })) }
      }
    };
    (global as any).chrome = mockChrome;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).chrome;
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // Listener registration
  // -------------------------------------------------------------------------

  it('should register listeners on load', async () => {
    await import('./main');
    expect(mockChrome.action.onClicked.addListener).toHaveBeenCalled();
    expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('should open side panel on action click', async () => {
    await import('./main');
    const listener = mockChrome.action.onClicked.addListener.mock.calls[0][0];
    listener({ windowId: 123 });
    expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
  });

  // -------------------------------------------------------------------------
  // onInstalled
  // -------------------------------------------------------------------------

  it('should open on-install page on install', async () => {
    await import('./main');
    const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
    listener({ reason: 'install' });
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: 'on-install/index.html' });
  });

  it('should open on-install page on update', async () => {
    await import('./main');
    const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
    listener({ reason: 'update' });
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: 'on-install/index.html' });
  });

  // -------------------------------------------------------------------------
  // Helper to get the onMessage handler
  // -------------------------------------------------------------------------

  async function getMessageHandler() {
    await import('./main');
    return mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
  }

  // -------------------------------------------------------------------------
  // log_api_call
  // -------------------------------------------------------------------------

  it('should handle log_api_call and save to DB', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    const result = handler(
      { action: 'log_api_call', payload: { id: 'test-1', origin: 'http://example.com' } },
      { tab: { url: 'http://example.com/page' } },
      sendResponse
    );

    expect(result).toBe(true);
    expect(db.saveCall).toHaveBeenCalledWith({ id: 'test-1', origin: 'http://example.com' });
  });

  it('should set origin from sender tab URL when missing', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler(
      { action: 'log_api_call', payload: { id: 'test-2' } },
      { tab: { url: 'http://other.com/page' } },
      sendResponse
    );

    // The origin should be extracted from sender.tab.url
    expect(db.saveCall).toHaveBeenCalledWith(expect.objectContaining({ origin: 'http://other.com' }));
  });

  it('should handle log_api_call DB error', async () => {
    (db.saveCall as any).mockRejectedValueOnce(new Error('DB write failed'));
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler(
      { action: 'log_api_call', payload: { id: 'fail', origin: 'http://example.com' } },
      {},
      sendResponse
    );
    // Wait for async
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ error: 'DB write failed' }));
  });

  // -------------------------------------------------------------------------
  // get_all_history
  // -------------------------------------------------------------------------

  it('should handle get_all_history', async () => {
    (db.getAllHistory as any).mockResolvedValueOnce([{ id: 'h1' }, { id: 'h2' }]);
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    const result = handler({ action: 'get_all_history' }, {}, sendResponse);

    expect(result).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ data: [{ id: 'h1' }, { id: 'h2' }] }));
  });

  // -------------------------------------------------------------------------
  // get_history_item
  // -------------------------------------------------------------------------

  it('should handle get_history_item', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler({ action: 'get_history_item', payload: { id: 'item-1' } }, {}, sendResponse);

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ data: { id: 'item-1' } }));
  });

  // -------------------------------------------------------------------------
  // get_api_history
  // -------------------------------------------------------------------------

  it('should handle get_api_history with origin from payload', async () => {
    (db.getHistory as any).mockResolvedValueOnce([{ id: 'h1' }]);
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler(
      { action: 'get_api_history', payload: { origin: 'http://test.com', apiName: 'Summarizer' } },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(db.getHistory).toHaveBeenCalledWith('http://test.com', 'Summarizer');
      expect(sendResponse).toHaveBeenCalledWith({ data: [{ id: 'h1' }] });
    });
  });

  it('should handle get_api_history with origin from sender tab URL', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler(
      { action: 'get_api_history', payload: { apiName: 'all' } },
      { tab: { url: 'http://sender.com/page' } },
      sendResponse
    );

    await vi.waitFor(() => expect(db.getHistory).toHaveBeenCalledWith('http://sender.com', 'all'));
  });

  it('should reject get_api_history when origin is missing', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    const result = handler({ action: 'get_api_history', payload: {} }, {}, sendResponse);

    // Returns true to keep the message port open for the async error response
    expect(result).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ error: 'Missing origin' }));
  });

  // -------------------------------------------------------------------------
  // clear_api_history
  // -------------------------------------------------------------------------

  it('should handle clear_api_history', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler(
      { action: 'clear_api_history', payload: { origin: 'http://test.com' } },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(db.clearHistory).toHaveBeenCalledWith('http://test.com');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  // -------------------------------------------------------------------------
  // clear_all_history
  // -------------------------------------------------------------------------

  it('should handle clear_all_history', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler({ action: 'clear_all_history' }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(db.clearAllHistory).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  // -------------------------------------------------------------------------
  // delete_api_session
  // -------------------------------------------------------------------------

  it('should handle delete_api_session', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler(
      { action: 'delete_api_session', payload: { origin: 'http://test.com', sessionId: 'sess-1' } },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(db.deleteSession).toHaveBeenCalledWith('http://test.com', 'sess-1');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  it('should reject delete_api_session when origin or sessionId is missing', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    const result = handler({ action: 'delete_api_session', payload: { origin: 'http://test.com' } }, {}, sendResponse);

    // Returns true to keep the message port open for the async error response
    expect(result).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ error: 'Missing origin or sessionId' }));
  });

  // -------------------------------------------------------------------------
  // getHardwareInformation
  // -------------------------------------------------------------------------

  it('should handle getHardwareInformation', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler({ action: 'getHardwareInformation' }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        cpu: { archName: 'x86_64', numOfProcessors: 8 },
        memory: { capacity: 16000000000, availableCapacity: 8000000000 }
      });
    });
  });

  // -------------------------------------------------------------------------
  // get_setting / set_setting
  // -------------------------------------------------------------------------

  it('should handle get_setting', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler({ action: 'get_setting', key: 'wrap_api', defaultValue: true }, {}, sendResponse);

    expect(db.getSetting).toHaveBeenCalledWith('wrap_api', true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ value: true }));
  });

  it('should handle set_setting', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    handler({ action: 'set_setting', key: 'wrap_api', value: false }, {}, sendResponse);

    expect(db.setSetting).toHaveBeenCalledWith('wrap_api', false);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: true }));
  });

  // -------------------------------------------------------------------------
  // Unknown action
  // -------------------------------------------------------------------------

  it('should return false for unknown actions', async () => {
    const handler = await getMessageHandler();
    const sendResponse = vi.fn();
    const result = handler({ action: 'unknown_action' }, {}, sendResponse);
    expect(result).toBe(false);
  });
});
