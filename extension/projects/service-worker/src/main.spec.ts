import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from './db';

vi.mock('./db', () => ({
  db: {
    saveCall: vi.fn().mockResolvedValue(undefined),
    getAllHistory: vi.fn().mockResolvedValue([]),
    getHistoryItem: vi.fn().mockResolvedValue({}),
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
        cpu: { getInfo: vi.fn() },
        memory: { getInfo: vi.fn() }
      }
    };
    (global as any).chrome = mockChrome;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).chrome;
    vi.resetModules();
  });

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

  it('should open on-install page on install', async () => {
    await import('./main');
    const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0][0];
    listener({ reason: 'install' });
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: 'on-install/index.html' });
  });

  it('should handle log_api_call message', async () => {
    await import('./main');
    const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    const sendResponse = vi.fn();
    const result = listener(
      { action: 'log_api_call', payload: { id: 'test', origin: 'http://localhost' } },
      { tab: { url: 'http://localhost/page' } },
      sendResponse
    );
    
    expect(result).toBe(true);
    expect(db.saveCall).toHaveBeenCalledWith({ id: 'test', origin: 'http://localhost' });
  });

  it('should handle get_setting message', async () => {
    await import('./main');
    const listener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    const sendResponse = vi.fn();
    const result = listener(
      { action: 'get_setting', key: 'wrap_api', defaultValue: true },
      {},
      sendResponse
    );
    
    expect(result).toBe(true);
    expect(db.getSetting).toHaveBeenCalledWith('wrap_api', true);
  });
});
