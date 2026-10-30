import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RoutingRequestMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';

declare const chrome: any;

/**
 * Handles WEBAI_ROUTING_REQUEST by fetching the active provider ID from settings
 * and returning it to the injected script.
 *
 * Fails open to `'chrome'` if the extension runtime context was invalidated
 * (for example, after an extension update while a page stayed open).
 */
export class RoutingHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.ROUTING_REQUEST;

  handle(message: RoutingRequestMessage): void {
    const messageId = message.messageId;
    const reply = (modelRouting: string) => {
      window.postMessage(
        {
          type: WindowMessageType.ROUTING_RESPONSE,
          messageId,
          data: { modelRouting },
        },
        '*',
      );
    };

    try {
      chrome.runtime.sendMessage(
        { action: RuntimeMessageAction.GET_SETTING, key: 'activeProviderId', defaultValue: 'chrome' },
        (response: any) => {
          if (chrome.runtime?.lastError) {
            reply('chrome');
            return;
          }
          reply(response?.value || 'chrome');
        },
      );
    } catch {
      reply('chrome');
    }
  }
}
