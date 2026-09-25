import { CLASSIFIER_PROGRESS_ACTION } from '../../base/src/lib/classifier/messaging/classifier-runtime-target.const';
import { ClassifierProgressMessage } from '../../base/src/lib/classifier/interfaces/classifier-progress-message.interface';

declare const chrome: any;

/**
 * Broadcasts download progress for one request. Extension pages receive it
 * directly; the service worker relays it to the originating tab's content script.
 */
export class ClassifierProgressEmitter {
  private lastLoaded = -1;

  constructor(
    private readonly requestId: string,
    private readonly clientTabId: number | undefined,
    private readonly variantId?: string,
  ) {}

  emit(loaded: number): void {
    // Cap the message rate: only forward changes of at least 0.1%.
    if (loaded < 1 && loaded - this.lastLoaded < 0.001) return;
    this.lastLoaded = loaded;
    const message: ClassifierProgressMessage = {
      action: CLASSIFIER_PROGRESS_ACTION,
      requestId: this.requestId,
      clientTabId: this.clientTabId,
      loaded,
      variantId: this.variantId,
    };
    try {
      chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
    } catch {
      // Nobody listening.
    }
  }
}
