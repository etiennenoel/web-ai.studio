import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { ApiCallWindowMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';
import { ApiCallRecord } from '../../../shared/interfaces/api-call-record.interface';
import { mergePayloadIntoMemoryRecord } from '../../../shared/utils/api-call-record.utils';

declare const chrome: any;

const MAX_IN_MEMORY_PAGE_CALLS = 500;

function detectIsSubframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Handles WEBAI_API_CALL messages by forwarding the API call payload
 * to the service worker for persistence in IndexedDB.
 *
 * It also maintains a bounded, `dataUrl`-stripped in-memory cache of the
 * current frame's calls for the side panel's active session view.
 */
export class ApiCallForwardHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.API_CALL;

  private static currentPageCalls = new Map<string, ApiCallRecord>();

  /**
   * Returns all API calls captured in the current frame session, sorted newest-first.
   */
  public static getCurrentPageCalls(): ApiCallRecord[] {
    const records = Array.from(this.currentPageCalls.values());
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clears the in-memory API calls captured for the current frame session.
   */
  public static clearCurrentPageCalls(): void {
    this.currentPageCalls.clear();
  }

  handle(message: ApiCallWindowMessage): void {
    const data = message.payload;
    const isSubframe = detectIsSubframe();

    const existing = ApiCallForwardHandler.currentPageCalls.get(data.id);
    const updated = mergePayloadIntoMemoryRecord(
      existing,
      data,
      isSubframe ? { isSubframe: true } : undefined,
    );

    if (!existing && ApiCallForwardHandler.currentPageCalls.size >= MAX_IN_MEMORY_PAGE_CALLS) {
      const oldestKey = ApiCallForwardHandler.currentPageCalls.keys().next().value;
      if (oldestKey !== undefined) {
        ApiCallForwardHandler.currentPageCalls.delete(oldestKey);
      }
    }
    ApiCallForwardHandler.currentPageCalls.set(data.id, updated);

    // Forward full payload to service worker for IndexedDB persistence & tab aggregation
    try {
      chrome.runtime.sendMessage(
        { action: RuntimeMessageAction.LOG_API_CALL, payload: message.payload },
        () => {
          if (chrome.runtime?.lastError) {
            // Intentionally ignored
          }
        },
      );
    } catch {
      // Extension context may have been invalidated after an update
    }
  }
}
