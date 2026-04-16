import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { ApiCallWindowMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';

declare const chrome: any;

/**
 * Handles WEBAI_API_CALL messages by forwarding the API call payload
 * to the service worker for persistence in IndexedDB.
 *
 * This is a one-way message (fire-and-forget): the injected script
 * doesn't wait for a response. We still handle chrome.runtime.lastError
 * to avoid console warnings, but we don't act on errors.
 */
export class ApiCallForwardHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.API_CALL;

  handle(message: ApiCallWindowMessage): void {
    chrome.runtime.sendMessage(
      { action: RuntimeMessageAction.LOG_API_CALL, payload: message.payload },
      () => {
        // Suppress chrome.runtime.lastError console warnings
        if (chrome.runtime.lastError) {
          // Intentionally ignored: logging failures are non-critical
        }
      },
    );
  }
}
