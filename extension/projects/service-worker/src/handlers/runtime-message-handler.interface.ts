import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage } from '../../../shared/interfaces/runtime-messages.interface';

/**
 * Interface for classes that handle one or more chrome.runtime message actions
 * in the service worker.
 *
 * Each handler encapsulates the logic for a specific domain (history, settings, etc.)
 * and returns a promise that resolves with the response to send back.
 */
export interface RuntimeMessageHandler {
  /** The action(s) this handler is responsible for. */
  readonly handledActions: RuntimeMessageAction[];

  /**
   * Process the message and return the response.
   *
   * @param request - The typed chrome.runtime message.
   * @param sender - The sender information from chrome.runtime.onMessage.
   * @returns A promise resolving to the response object.
   */
  handle(request: RuntimeMessage, sender: any): Promise<unknown>;
}
