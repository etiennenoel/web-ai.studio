import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { GetHistoryRequestMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';

declare const chrome: any;

/**
 * Handles WEBAI_GET_HISTORY requests by forwarding them to the service worker
 * (which queries IndexedDB) and relaying the response back to the injected script.
 *
 * This bridges the gap between the page context (which cannot access chrome.runtime)
 * and the service worker (which has IndexedDB access).
 */
export class HistoryForwardHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.GET_HISTORY_REQUEST;

  handle(message: GetHistoryRequestMessage): void {
    const messageId = message.messageId;

    chrome.runtime.sendMessage(
      { action: RuntimeMessageAction.GET_API_HISTORY, payload: message.payload },
      (response: any) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: WindowMessageType.GET_HISTORY_RESPONSE,
            messageId,
            error: chrome.runtime.lastError.message,
          }, '*');
          return;
        }

        window.postMessage({
          type: WindowMessageType.GET_HISTORY_RESPONSE,
          messageId,
          data: response.data,
          error: response.error,
        }, '*');
      },
    );
  }
}
