import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import {
  RuntimeMessage,
  GetHistoryItemMessage,
  GetApiHistoryMessage,
  ClearApiHistoryMessage,
  DeleteApiSessionMessage,
} from '../../../shared/interfaces/runtime-messages.interface';
import { WebAIDatabase } from '../db';
import { TabSessionsStore } from '../tab-sessions.store';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

declare const chrome: any;

/**
 * Handles all history-related chrome.runtime messages.
 *
 * Consolidates six actions into one handler since they all operate on
 * the same IndexedDB object store and share the same domain context.
 */
export class HistoryHandler implements RuntimeMessageHandler {
  readonly handledActions = [
    RuntimeMessageAction.GET_ALL_HISTORY,
    RuntimeMessageAction.GET_HISTORY_ITEM,
    RuntimeMessageAction.GET_API_HISTORY,
    RuntimeMessageAction.CLEAR_API_HISTORY,
    RuntimeMessageAction.CLEAR_ALL_HISTORY,
    RuntimeMessageAction.DELETE_API_SESSION,
  ];

  constructor(
    private readonly database: WebAIDatabase,
    private readonly tabSessions?: TabSessionsStore,
  ) {}

  async handle(request: RuntimeMessage, sender: any): Promise<unknown> {
    switch (request.action) {
      case RuntimeMessageAction.GET_ALL_HISTORY: {
        const history = await this.database.getAllHistory();
        return { data: history };
      }

      case RuntimeMessageAction.GET_HISTORY_ITEM: {
        const msg = request as GetHistoryItemMessage;
        const item = await this.database.getHistoryItem(msg.payload.id);
        return { data: item };
      }

      case RuntimeMessageAction.GET_API_HISTORY: {
        const msg = request as GetApiHistoryMessage;
        const origin = msg.payload?.origin || this.extractOrigin(sender);
        if (!origin) return { error: 'Missing origin' };

        const apiName = msg.payload?.apiName || 'all';
        const history = await this.database.getHistory(origin, apiName);
        return { data: history };
      }

      case RuntimeMessageAction.CLEAR_API_HISTORY: {
        const msg = request as ClearApiHistoryMessage;
        const origin = msg.payload?.origin || this.extractOrigin(sender);
        if (!origin) return { error: 'Missing origin' };

        await this.database.clearHistory(origin);
        this.tabSessions?.clearOrigin(origin);
        this.clearMatchingOpenTabs(origin);
        return { success: true };
      }

      case RuntimeMessageAction.CLEAR_ALL_HISTORY: {
        await this.database.clearAllHistory();
        this.tabSessions?.clearAll();
        this.clearMatchingOpenTabs(null);
        return { success: true };
      }

      case RuntimeMessageAction.DELETE_API_SESSION: {
        const msg = request as DeleteApiSessionMessage;
        const origin = msg.payload?.origin || this.extractOrigin(sender);
        const sessionId = msg.payload?.sessionId;
        if (!origin || !sessionId) return { error: 'Missing origin or sessionId' };

        await this.database.deleteSession(origin, sessionId);
        this.tabSessions?.deleteSession(origin, sessionId);
        return { success: true };
      }

      default:
        return { error: `HistoryHandler: Unhandled action ${request.action}` };
    }
  }

  /**
   * Clears live content-script memory and resets toolbar icons on open tabs
   * matching `targetOrigin` (or all tabs when `targetOrigin` is `null`).
   */
  private clearMatchingOpenTabs(targetOrigin: string | null): void {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;

    try {
      chrome.tabs.query({}, (tabs: any[]) => {
        if (chrome.runtime?.lastError || !Array.isArray(tabs)) return;

        for (const tab of tabs) {
          if (typeof tab?.id !== 'number') continue;

          if (targetOrigin !== null) {
            if (!tab.url) continue;
            try {
              const tabUrl = new URL(tab.url);
              const tabOrigin =
                tabUrl.origin !== 'null' ? tabUrl.origin : `${tabUrl.protocol}//`;
              if (tabOrigin !== targetOrigin) continue;
            } catch {
              continue;
            }
          }

          if (chrome.tabs?.sendMessage) {
            chrome.tabs.sendMessage(
              tab.id,
              { action: RuntimeMessageAction.CLEAR_PAGE_SESSIONS },
              () => {
                void chrome.runtime?.lastError;
              },
            );
          }

          if (chrome.action?.setIcon) {
            chrome.action.setIcon(
              { path: 'assets/images/icon.png', tabId: tab.id },
              () => {
                void chrome.runtime?.lastError;
              },
            );
          }
        }
      });
    } catch {
      // Ignore if tabs API is unavailable
    }
  }

  /** Extracts the origin from the sender tab's URL, if available. */
  private extractOrigin(sender: any): string | null {
    if (sender?.tab?.url) {
      try {
        return new URL(sender.tab.url).origin;
      } catch {
        return null;
      }
    }
    return null;
  }
}
