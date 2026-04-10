import { RuntimeMessageAction } from '../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage } from '../../shared/interfaces/runtime-messages.interface';
import { RuntimeMessageHandler } from './handlers/runtime-message-handler.interface';
import { LogApiCallHandler } from './handlers/log-api-call.handler';
import { HistoryHandler } from './handlers/history.handler';
import { HardwareInfoHandler } from './handlers/hardware-info.handler';
import { SettingsHandler } from './handlers/settings.handler';
import { WebAIDatabase } from './db';

/**
 * Routes incoming chrome.runtime messages to the appropriate handler.
 *
 * Uses a switch statement on the action field for exhaustive compile-time
 * checking. TypeScript will error at the `never` default if a new enum value
 * is added to RuntimeMessageAction but not handled here.
 */
export class RuntimeMessageDispatcher {
  private readonly handlers: Map<RuntimeMessageAction, RuntimeMessageHandler>;

  constructor(database: WebAIDatabase) {
    this.handlers = new Map();

    const allHandlers: RuntimeMessageHandler[] = [
      new LogApiCallHandler(database),
      new HistoryHandler(database),
      new HardwareInfoHandler(),
      new SettingsHandler(database),
    ];

    for (const handler of allHandlers) {
      for (const action of handler.handledActions) {
        this.handlers.set(action, handler);
      }
    }
  }

  /**
   * Dispatches a chrome.runtime message to the appropriate handler.
   *
   * @returns true if the handler will respond asynchronously (caller should keep
   *          the sendResponse channel open), false if the action was not recognized.
   */
  dispatch(
    request: RuntimeMessage,
    sender: any,
    sendResponse: (response: unknown) => void,
  ): boolean {
    const action = request.action;

    switch (action) {
      case RuntimeMessageAction.LOG_API_CALL:
      case RuntimeMessageAction.GET_ALL_HISTORY:
      case RuntimeMessageAction.GET_HISTORY_ITEM:
      case RuntimeMessageAction.GET_API_HISTORY:
      case RuntimeMessageAction.CLEAR_API_HISTORY:
      case RuntimeMessageAction.CLEAR_ALL_HISTORY:
      case RuntimeMessageAction.DELETE_API_SESSION:
      case RuntimeMessageAction.GET_HARDWARE_INFO:
      case RuntimeMessageAction.GET_SETTING:
      case RuntimeMessageAction.SET_SETTING: {
        const handler = this.handlers.get(action);
        if (!handler) {
          sendResponse({ error: `No handler registered for action: ${action}` });
          return false;
        }

        handler.handle(request, sender)
          .then((result) => sendResponse(result))
          .catch((err) => {
            console.error(`Failed to handle ${action}`, err);
            sendResponse({ error: err.message });
          });

        return true;
      }

      // DIAGNOSE_APIS is handled by the content script, not the service worker.
      // It arrives here only if sent from devtools panel directly; the content
      // script's onMessage listener handles it before it reaches the service worker.
      case RuntimeMessageAction.DIAGNOSE_APIS:
        return false;

      default: {
        // Exhaustive check: TypeScript will error if a new RuntimeMessageAction
        // is added but not handled in the switch above.
        const _exhaustive: never = action;
        void _exhaustive;
        return false;
      }
    }
  }
}
