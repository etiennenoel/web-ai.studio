import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RoutingRequestMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';

declare const chrome: any;

/**
 * Handles WEBAI_ROUTING_REQUEST by fetching the active provider ID from settings
 * and returning it to the injected script.
 *
 * The injected script uses this to decide whether to call Chrome's built-in AI
 * or route the request through an external provider (Gemini/OpenAI).
 */
export class RoutingHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.ROUTING_REQUEST;

  handle(message: RoutingRequestMessage): void {
    const messageId = message.messageId;

    chrome.runtime.sendMessage(
      { action: RuntimeMessageAction.GET_SETTING, key: 'activeProviderId', defaultValue: 'chrome' },
      (response: any) => {
        const routing = response?.value || 'chrome';
        window.postMessage({
          type: WindowMessageType.ROUTING_RESPONSE,
          messageId,
          data: { modelRouting: routing },
        }, '*');
      },
    );
  }
}
