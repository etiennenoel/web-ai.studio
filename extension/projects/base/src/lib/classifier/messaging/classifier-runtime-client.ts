import { ClassifierRuntimeOp } from '../enums/classifier-runtime-op.enum';
import { ClassifierRuntimeRequest } from '../interfaces/classifier-runtime-request.interface';
import { ClassifierRuntimeResponse } from '../interfaces/classifier-runtime-response.interface';
import { ClassifierProgressMessage } from '../interfaces/classifier-progress-message.interface';
import {
  CLASSIFIER_PROGRESS_ACTION,
  CLASSIFIER_REQUEST_ACTION,
  CLASSIFIER_RUNTIME_TARGET,
  ENSURE_OFFSCREEN_ACTION,
} from './classifier-runtime-target.const';
import { deserializeClassifierError } from './classifier-error.utils';

declare const chrome: any;

const PING_ATTEMPTS = 60;
const PING_DELAY_MS = 250;

/**
 * Talks to the offscreen classifier runtime from any extension context that
 * has `chrome.runtime` (content scripts, devtools panel, side panel).
 *
 * The service worker creates the offscreen document on `ensure_offscreen`;
 * every other request goes straight to the offscreen document. If the
 * document disappeared (extension reload, Chrome closed it), the next request
 * re-creates it and is retried once.
 */
export class ClassifierRuntimeClient {
  private static ensured: Promise<number | undefined> | null = null;

  /** Last handshake failure, for diagnostics. */
  static lastError: string | null = null;

  /** Makes sure the offscreen document exists. Resolves with the caller's tab id when known. */
  static ensureRuntime(): Promise<number | undefined> {
    if (!this.ensured) {
      this.ensured = this.ensureRuntimeUncached().catch((e) => {
        this.ensured = null;
        this.lastError = e instanceof Error ? e.message : String(e);
        throw e;
      });
    }
    return this.ensured;
  }

  static async request<T>(
    op: ClassifierRuntimeOp,
    payload?: unknown,
    options: { requestId?: string; onProgress?: (loaded: number) => void } = {},
  ): Promise<T> {
    try {
      return await this.requestOnce<T>(op, payload, options);
    } catch (e) {
      if (!ClassifierRuntimeClient.isTransportError(e)) throw e;
      // The offscreen document is gone; re-create it and retry once.
      this.ensured = null;
      return this.requestOnce<T>(op, payload, options);
    }
  }

  /** Fire-and-forget abort of an in-flight request. */
  static abort(requestId: string): void {
    const message: ClassifierRuntimeRequest = {
      action: CLASSIFIER_REQUEST_ACTION,
      target: CLASSIFIER_RUNTIME_TARGET,
      op: ClassifierRuntimeOp.ABORT,
      requestId: crypto.randomUUID(),
      payload: { requestId },
    };
    this.sendRuntimeMessage(message).catch(() => undefined);
  }

  private static async requestOnce<T>(
    op: ClassifierRuntimeOp,
    payload: unknown,
    options: { requestId?: string; onProgress?: (loaded: number) => void },
  ): Promise<T> {
    const clientTabId = await this.ensureRuntime();
    const requestId = options.requestId ?? crypto.randomUUID();

    const progressListener = options.onProgress
      ? (message: ClassifierProgressMessage) => {
          if (message?.action === CLASSIFIER_PROGRESS_ACTION && message.requestId === requestId) {
            options.onProgress!(message.loaded);
          }
        }
      : null;
    if (progressListener) chrome.runtime.onMessage.addListener(progressListener);

    try {
      const message: ClassifierRuntimeRequest = {
        action: CLASSIFIER_REQUEST_ACTION,
        target: CLASSIFIER_RUNTIME_TARGET,
        op,
        requestId,
        clientTabId,
        payload,
      };
      const response = await this.sendRuntimeMessage<ClassifierRuntimeResponse<T>>(message);
      if (!response) {
        throw new DOMException('Classifier runtime did not respond (offscreen document unreachable).', 'InvalidStateError');
      }
      if (!response.ok) {
        throw deserializeClassifierError(response.error ?? { name: 'Error', message: 'Unknown runtime error' });
      }
      return response.value as T;
    } finally {
      if (progressListener) chrome.runtime.onMessage.removeListener(progressListener);
    }
  }

  private static async ensureRuntimeUncached(): Promise<number | undefined> {
    let ensured: { tabId?: number; error?: string } | undefined;
    try {
      ensured = await this.sendRuntimeMessage<{ tabId?: number; error?: string }>({ action: ENSURE_OFFSCREEN_ACTION });
    } catch (e) {
      throw new DOMException(
        `Classifier runtime: the extension service worker did not answer (${(e as Error).message}). Reload the extension from chrome://extensions.`,
        'InvalidStateError',
      );
    }
    if (ensured?.error) {
      throw new DOMException(`Classifier runtime: offscreen document could not be created: ${ensured.error}`, 'InvalidStateError');
    }

    // The document may still be loading; wait until it answers a ping.
    let lastFailure = 'no answer';
    for (let attempt = 0; attempt < PING_ATTEMPTS; attempt++) {
      try {
        const pong = await this.sendRuntimeMessage<ClassifierRuntimeResponse>({
          action: CLASSIFIER_REQUEST_ACTION,
          target: CLASSIFIER_RUNTIME_TARGET,
          op: ClassifierRuntimeOp.PING,
          requestId: crypto.randomUUID(),
        });
        if (pong?.ok) {
          this.lastError = null;
          return ensured?.tabId;
        }
        lastFailure = pong?.error?.message ?? 'unexpected ping reply';
      } catch (e) {
        lastFailure = (e as Error).message;
        if (!this.isExtensionContext) break;
      }
      await new Promise((r) => setTimeout(r, PING_DELAY_MS));
    }
    throw new DOMException(
      `Classifier runtime did not start within ${(PING_ATTEMPTS * PING_DELAY_MS) / 1000}s (${lastFailure}). Reload the extension from chrome://extensions.`,
      'InvalidStateError',
    );
  }

  private static isTransportError(e: unknown): boolean {
    const message = e instanceof Error ? e.message : String(e);
    return /did not respond|message port closed|Receiving end does not exist|offscreen document unreachable/i.test(message);
  }

  /** True only inside extension contexts; web pages expose a `chrome.runtime` that never answers. */
  static get isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id && typeof chrome.runtime.sendMessage === 'function';
  }

  private static sendRuntimeMessage<T>(message: unknown): Promise<T | undefined> {
    if (!this.isExtensionContext) {
      return Promise.reject(
        new DOMException('Classifier runtime is only reachable from inside the WebAI extension.', 'InvalidStateError'),
      );
    }
    return new Promise<T | undefined>((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response: T) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
