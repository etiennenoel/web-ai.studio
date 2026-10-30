import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import {
  GetTabSessionsMessage,
  RuntimeMessage,
  SyncTabSessionsMessage,
} from '../../../shared/interfaces/runtime-messages.interface';
import { ApiCallRecord } from '../../../shared/interfaces/api-call-record.interface';
import { TabSessionsStore } from '../tab-sessions.store';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

declare const chrome: any;

/**
 * Handles multi-frame active tab session queries, navigation resets, and frame syncs.
 */
export class TabSessionsHandler implements RuntimeMessageHandler {
  readonly handledActions = [
    RuntimeMessageAction.GET_TAB_SESSIONS,
    RuntimeMessageAction.PAGE_NAVIGATION_START,
    RuntimeMessageAction.SYNC_TAB_SESSIONS,
  ];

  constructor(private readonly tabSessions: TabSessionsStore) {}

  async handle(request: RuntimeMessage, sender: any): Promise<unknown> {
    switch (request.action) {
      case RuntimeMessageAction.GET_TAB_SESSIONS: {
        const msg = request as GetTabSessionsMessage;
        if (typeof msg.tabId !== 'number') {
          return { data: [] };
        }
        return { data: this.tabSessions.getTabCalls(msg.tabId) };
      }

      case RuntimeMessageAction.PAGE_NAVIGATION_START: {
        const tabId = sender?.tab?.id;
        if (typeof tabId === 'number') {
          const frameId = sender?.frameId;
          if (!frameId || frameId === 0) {
            this.tabSessions.clearTab(tabId);
            if (typeof chrome !== 'undefined' && chrome.action?.setIcon) {
              chrome.action.setIcon({ path: 'assets/images/icon.png', tabId }, () => {
                void chrome.runtime?.lastError;
              });
            }
          } else {
            this.tabSessions.clearFrame(tabId, frameId);
          }
        }
        return { success: true };
      }

      case RuntimeMessageAction.SYNC_TAB_SESSIONS: {
        const msg = request as SyncTabSessionsMessage;
        const tabId = sender?.tab?.id;
        if (typeof tabId === 'number' && Array.isArray(msg.records)) {
          this.tabSessions.syncRecords(tabId, msg.records as ApiCallRecord[], sender?.frameId);
        }
        return { success: true };
      }

      default:
        return { error: `TabSessionsHandler: Unhandled action ${request.action}` };
    }
  }
}
