import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuntimeMessageDispatcher } from './runtime-message-dispatcher';
import { RuntimeMessageAction } from '../../shared/enums/runtime-message-action.enum';
import { WebAIDatabase } from './db';

describe('RuntimeMessageDispatcher', () => {
  let db: WebAIDatabase;
  let dispatcher: RuntimeMessageDispatcher;
  let sendResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    db = {
      saveCall: vi.fn().mockResolvedValue(undefined),
      getAllHistory: vi.fn().mockResolvedValue([]),
      getHistoryItem: vi.fn().mockResolvedValue(null),
      getHistory: vi.fn().mockResolvedValue([]),
      clearHistory: vi.fn().mockResolvedValue(undefined),
      clearAllHistory: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
      getSetting: vi.fn().mockResolvedValue('default'),
      setSetting: vi.fn().mockResolvedValue(undefined),
    } as unknown as WebAIDatabase;

    dispatcher = new RuntimeMessageDispatcher(db);
    sendResponse = vi.fn();
  });

  it('should return true for all handled actions (keeps message port open)', () => {
    const handledActions = [
      RuntimeMessageAction.LOG_API_CALL,
      RuntimeMessageAction.GET_ALL_HISTORY,
      RuntimeMessageAction.GET_HISTORY_ITEM,
      RuntimeMessageAction.GET_API_HISTORY,
      RuntimeMessageAction.CLEAR_API_HISTORY,
      RuntimeMessageAction.CLEAR_ALL_HISTORY,
      RuntimeMessageAction.DELETE_API_SESSION,
      RuntimeMessageAction.GET_HARDWARE_INFO,
      RuntimeMessageAction.GET_SETTING,
      RuntimeMessageAction.SET_SETTING,
    ];

    for (const action of handledActions) {
      // GET_HARDWARE_INFO needs chrome mocks, skip its handler execution
      if (action === RuntimeMessageAction.GET_HARDWARE_INFO) continue;

      const result = dispatcher.dispatch(
        { action, payload: { id: '1', origin: 'http://test.com', sessionId: 's1' }, key: 'k', defaultValue: 'd', value: 'v' } as any,
        { tab: { url: 'http://test.com/page' } },
        sendResponse,
      );
      expect(result).toBe(true);
    }
  });

  it('should return false for DIAGNOSE_APIS (handled by content script)', () => {
    const result = dispatcher.dispatch(
      { action: RuntimeMessageAction.DIAGNOSE_APIS } as any,
      {},
      sendResponse,
    );
    expect(result).toBe(false);
  });

  it('should route LOG_API_CALL to LogApiCallHandler', async () => {
    dispatcher.dispatch(
      { action: RuntimeMessageAction.LOG_API_CALL, payload: { id: '1', origin: 'http://x.com' } } as any,
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(db.saveCall).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  it('should route GET_ALL_HISTORY to HistoryHandler', async () => {
    dispatcher.dispatch(
      { action: RuntimeMessageAction.GET_ALL_HISTORY } as any,
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(db.getAllHistory).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ data: [] });
    });
  });

  it('should route GET_SETTING to SettingsHandler', async () => {
    dispatcher.dispatch(
      { action: RuntimeMessageAction.GET_SETTING, key: 'wrap_api', defaultValue: true } as any,
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(db.getSetting).toHaveBeenCalledWith('wrap_api', true);
      expect(sendResponse).toHaveBeenCalledWith({ value: 'default' });
    });
  });

  it('should route SET_SETTING to SettingsHandler', async () => {
    dispatcher.dispatch(
      { action: RuntimeMessageAction.SET_SETTING, key: 'wrap_api', value: false } as any,
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(db.setSetting).toHaveBeenCalledWith('wrap_api', false);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  it('should send error response when handler throws', async () => {
    (db.getAllHistory as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB crashed'));

    dispatcher.dispatch(
      { action: RuntimeMessageAction.GET_ALL_HISTORY } as any,
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ error: 'DB crashed' });
    });
  });

  it('should send error when no handler is found for a valid action', () => {
    // Construct a dispatcher with an empty handler map by manipulating internals
    // This is an edge case that shouldn't happen in production but tests the guard
    const brokenDispatcher = new RuntimeMessageDispatcher(db);
    (brokenDispatcher as any).handlers.clear();

    const result = brokenDispatcher.dispatch(
      { action: RuntimeMessageAction.LOG_API_CALL, payload: {} } as any,
      {},
      sendResponse,
    );

    // Still returns false because handler lookup fails synchronously
    expect(result).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('No handler registered') }),
    );
  });
});
