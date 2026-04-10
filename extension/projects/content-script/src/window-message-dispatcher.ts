import { WindowMessageType } from '../../shared/enums/window-message-type.enum';
import { WindowMessage } from '../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './handlers/window-message-handler.interface';
import { HwInfoHandler } from './handlers/hw-info.handler';
import { RoutingHandler } from './handlers/routing.handler';
import { ProviderRequestHandler } from './handlers/provider-request.handler';
import { ApiCallForwardHandler } from './handlers/api-call-forward.handler';
import { HistoryForwardHandler } from './handlers/history-forward.handler';

/**
 * Routes incoming window messages to the appropriate handler.
 *
 * Uses a switch statement on the message type for exhaustive compile-time
 * checking. TypeScript will error at the `never` default if a new enum value
 * is added to WindowMessageType but not handled here.
 *
 * Response message types (HW_INFO_RESPONSE, etc.) are intentionally not
 * dispatched here - they are consumed by pending Promises in the injected
 * script via WindowMessageBridge.
 */
export class WindowMessageDispatcher {
  private readonly handlers: Map<WindowMessageType, WindowMessageHandler>;

  constructor() {
    this.handlers = new Map();

    const allHandlers: WindowMessageHandler[] = [
      new HwInfoHandler(),
      new RoutingHandler(),
      new ProviderRequestHandler(),
      new ApiCallForwardHandler(),
      new HistoryForwardHandler(),
    ];

    for (const handler of allHandlers) {
      this.handlers.set(handler.handledType, handler);
    }
  }

  /**
   * Dispatches a window MessageEvent to the appropriate handler.
   * Called from the content script's window 'message' event listener.
   */
  dispatch(event: MessageEvent): void {
    if (event.source !== window) return;

    const message = event.data as WindowMessage;
    if (!message?.type) return;

    switch (message.type) {
      // Request types that we handle
      case WindowMessageType.HW_INFO_REQUEST:
      case WindowMessageType.ROUTING_REQUEST:
      case WindowMessageType.PROVIDER_REQUEST:
      case WindowMessageType.API_CALL:
      case WindowMessageType.GET_HISTORY_REQUEST:
        this.handlers.get(message.type)?.handle(message);
        break;

      // Response types are consumed by WindowMessageBridge promises, not dispatched here
      case WindowMessageType.HW_INFO_RESPONSE:
      case WindowMessageType.DIAGNOSIS_EVAL_REQUEST:
      case WindowMessageType.DIAGNOSIS_EVAL_RESPONSE:
      case WindowMessageType.GET_HISTORY_RESPONSE:
      case WindowMessageType.ROUTING_RESPONSE:
      case WindowMessageType.PROVIDER_RESPONSE:
        break;

      default: {
        // Exhaustive check: TypeScript will error if a new WindowMessageType
        // is added but not handled in the switch above.
        const _exhaustive: never = message;
        void _exhaustive;
        break;
      }
    }
  }
}
