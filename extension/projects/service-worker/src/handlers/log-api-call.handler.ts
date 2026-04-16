import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage, LogApiCallMessage } from '../../../shared/interfaces/runtime-messages.interface';
import { WebAIDatabase } from '../db';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

/**
 * Handles LOG_API_CALL messages by saving the API call payload to IndexedDB.
 *
 * If the payload is missing an origin (which can happen if the injected script
 * didn't include it), the origin is inferred from the sender tab's URL.
 */
export class LogApiCallHandler implements RuntimeMessageHandler {
  readonly handledActions = [RuntimeMessageAction.LOG_API_CALL];

  constructor(private readonly database: WebAIDatabase) {}

  async handle(request: RuntimeMessage, sender: any): Promise<unknown> {
    const msg = request as LogApiCallMessage;
    const payload = msg.payload;

    // Backfill origin from sender tab URL if missing
    if (!payload.origin && sender.tab?.url) {
      try {
        payload.origin = new URL(sender.tab.url).origin;
      } catch {
        // Invalid URL - leave origin unset
      }
    }

    await this.database.saveCall(payload);
    return { success: true };
  }
}
