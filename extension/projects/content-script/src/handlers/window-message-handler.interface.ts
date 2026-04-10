import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { WindowMessage } from '../../../shared/interfaces/window-messages.interface';

/**
 * Interface for classes that handle a specific window message type
 * in the content script.
 *
 * Each handler is responsible for one request type (e.g., HW_INFO_REQUEST)
 * and encapsulates all the logic needed to process that request and
 * send back a response.
 */
export interface WindowMessageHandler {
  /** The window message type this handler processes. */
  readonly handledType: WindowMessageType;

  /** Process the message. May be async (e.g., waiting for chrome.runtime responses). */
  handle(message: WindowMessage): void | Promise<void>;
}
