import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage, LogApiCallMessage } from '../../../shared/interfaces/runtime-messages.interface';
import { WebAIDatabase } from '../db';
import { TabSessionsStore } from '../tab-sessions.store';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

declare const chrome: any;

const STATIC_PROBE_METHODS = new Set(['availability', 'params', 'capabilities']);

/**
 * Handles LOG_API_CALL messages by saving the API call payload to IndexedDB
 * and aggregating active per-tab calls across all frames (`frameId === 0` + subframes).
 *
 * If the payload is missing an origin (which can happen if the injected script
 * didn't include it), the origin is inferred from the sender tab's URL.
 */
export class LogApiCallHandler implements RuntimeMessageHandler {
  readonly handledActions = [RuntimeMessageAction.LOG_API_CALL];

  constructor(
    private readonly database: WebAIDatabase,
    private readonly tabSessions?: TabSessionsStore,
  ) {}

  async handle(request: RuntimeMessage, sender: any): Promise<unknown> {
    const msg = request as LogApiCallMessage;
    const payload = msg.payload;

    // Backfill origin from sender URL or sender tab URL if missing
    if (!payload.origin) {
      const sourceUrl = sender?.url || sender?.tab?.url;
      if (sourceUrl) {
        try {
          payload.origin = new URL(sourceUrl).origin;
        } catch {
          // Invalid URL - leave origin unset
        }
      }
    }

    if (typeof sender?.frameId === 'number') {
      payload.frameId = sender.frameId;
      if (sender.frameId !== 0) {
        payload.isSubframe = true;
      }
    }

    if (typeof sender?.tab?.id === 'number') {
      this.tabSessions?.recordCall(sender.tab.id, payload, sender?.frameId);

      // Highlight toolbar icon when the tab actively creates/uses an AI session
      const isStaticProbeOnly =
        typeof payload.method === 'string' && STATIC_PROBE_METHODS.has(payload.method);
      if (!isStaticProbeOnly && typeof chrome !== 'undefined' && chrome.action?.setIcon) {
        chrome.action.setIcon(
          { path: 'assets/images/spark.png', tabId: sender.tab.id },
          () => {
            void chrome.runtime?.lastError;
          },
        );
      }
    }

    await this.database.saveCall(payload);
    return { success: true };
  }
}
