import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage, ClassifierProgressRuntimeMessage } from '../../../shared/interfaces/runtime-messages.interface';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

declare const chrome: any;

const OFFSCREEN_URL = 'offscreen.html';

/**
 * Owns the offscreen document that hosts the Classifier polyfill runtime.
 *
 * - ENSURE_OFFSCREEN creates the document once and tells the caller its tab id,
 *   so later progress notifications can be relayed back to that tab.
 * - CLASSIFIER_PROGRESS arrives from the offscreen document (which cannot use
 *   chrome.tabs) and is forwarded to the originating tab's content script.
 */
export class OffscreenHandler implements RuntimeMessageHandler {
  readonly handledActions = [RuntimeMessageAction.ENSURE_OFFSCREEN, RuntimeMessageAction.CLASSIFIER_PROGRESS];

  private creating: Promise<void> | null = null;

  async handle(request: RuntimeMessage, sender: any): Promise<unknown> {
    switch (request.action) {
      case RuntimeMessageAction.ENSURE_OFFSCREEN:
        await this.ensureDocument();
        return { tabId: sender?.tab?.id };

      case RuntimeMessageAction.CLASSIFIER_PROGRESS: {
        const progress = request as ClassifierProgressRuntimeMessage;
        if (progress.clientTabId !== undefined) {
          chrome.tabs.sendMessage(progress.clientTabId, progress, () => void chrome.runtime.lastError);
        }
        return {};
      }

      default:
        return { error: `OffscreenHandler: Unhandled action ${request.action}` };
    }
  }

  private async ensureDocument(): Promise<void> {
    if (await this.hasDocument()) return;
    if (!this.creating) {
      this.creating = chrome.offscreen
        .createDocument({
          url: OFFSCREEN_URL,
          reasons: ['WORKERS'],
          justification:
            'Runs the on-device Classifier API polyfill (LiteRT.js model inference) shared by every tab.',
        })
        .catch((e: Error) => {
          // Another caller may have created it first.
          if (!/single offscreen/i.test(e.message)) throw e;
        })
        .finally(() => {
          this.creating = null;
        });
    }
    await this.creating;
  }

  private async hasDocument(): Promise<boolean> {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
    });
    return contexts.length > 0;
  }
}
