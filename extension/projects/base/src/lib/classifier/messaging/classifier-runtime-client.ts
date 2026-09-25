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

const PING_ATTEMPTS = 40;
const PING_DELAY_MS = 150;

/**
 * Talks to the offscreen classifier runtime from any extension context that
 * has `chrome.runtime` (content scripts, devtools panel, side panel).
 *
 * The service worker creates the offscreen document on `ensure_offscreen`;
 * every other request goes straight to the offscreen document.
 */
export class ClassifierRuntimeClient {
  private static ensured: Promise<number | undefined> | null = null;

  /** Makes sure the offscreen document exists. Resolves with the caller's tab id when known. */
  static ensureRuntime(): Promise<number | undefined> {
    if (!this.ensured) {
      this.ensured = this.ensureRuntimeUncached().catch((e) => {
        this.ensured = null;
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
        throw new DOMException('Classifier runtime did not respond.', 'InvalidStateError');
      }
      if (!response.ok) {
        throw deserializeClassifierError(response.error ?? { name: 'Error', message: 'Unknown runtime error' });
      }
      return response.value as T;
    } finally {
      if (progressListener) chrome.runtime.onMessage.removeListener(progressListener);
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

  private static async ensureRuntimeUncached(): Promise<number | undefined> {
    const ensured = await this.sendRuntimeMessage<{ tabId?: number; error?: string }>({
      action: ENSURE_OFFSCREEN_ACTION,
    });
    if (ensured?.error) throw new Error(ensured.error);

    // The document may still be loading; wait until it answers a ping.
    for (let attempt = 0; attempt < PING_ATTEMPTS; attempt++) {
      const pong = await this.sendRuntimeMessage<ClassifierRuntimeResponse>({
        action: CLASSIFIER_REQUEST_ACTION,
        target: CLASSIFIER_RUNTIME_TARGET,
        op: ClassifierRuntimeOp.PING,
        requestId: crypto.randomUUID(),
      }).catch(() => undefined);
      if (pong?.ok) return ensured?.tabId;
      await new Promise((r) => setTimeout(r, PING_DELAY_MS));
    }
    throw new DOMException('Classifier runtime did not start.', 'InvalidStateError');
  }

  private static sendRuntimeMessage<T>(message: unknown): Promise<T | undefined> {
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
