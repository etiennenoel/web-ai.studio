import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { ClassifierRuntimeOp } from '../../../base/src/lib/classifier/enums/classifier-runtime-op.enum';
import { ClassifierRuntimeResponse } from '../../../base/src/lib/classifier/interfaces/classifier-runtime-response.interface';
import { deserializeClassifierError } from '../../../base/src/lib/classifier/messaging/classifier-error.utils';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Page-context transport for the Classifier polyfill. Posts a request to the
 * content script and resolves with the offscreen runtime's answer.
 */
export class ClassifierPageBridge {
  static request<T>(
    op: ClassifierRuntimeOp,
    payload: unknown,
    options: { requestId?: string; onProgress?: (loaded: number) => void; timeoutMs?: number } = {},
  ): Promise<T> {
    const requestId = options.requestId ?? crypto.randomUUID();
    const messageId = `webai-classifier-${requestId}`;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise<T>((resolve, reject) => {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        window.removeEventListener('message', listener);
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      };

      const listener = (event: MessageEvent) => {
        if (event.source !== window || !event.data) return;
        const data = event.data;
        if (data.type === WindowMessageType.CLASSIFIER_PROGRESS && data.requestId === requestId) {
          options.onProgress?.(Number(data.loaded));
          return;
        }
        if (data.type !== WindowMessageType.CLASSIFIER_RESPONSE || data.messageId !== messageId) return;
        cleanup();
        const response = data.data as ClassifierRuntimeResponse<T>;
        if (response?.ok) resolve(response.value as T);
        else reject(deserializeClassifierError(response?.error ?? { name: 'InvalidStateError', message: 'Classifier runtime returned no response.' }));
      };

      window.addEventListener('message', listener);
      window.postMessage({ type: WindowMessageType.CLASSIFIER_REQUEST, messageId, op, requestId, payload }, '*');

      timeoutHandle = setTimeout(() => {
        cleanup();
        reject(new DOMException(`Classifier runtime timed out (${op}).`, 'TimeoutError'));
      }, timeoutMs);
    });
  }

  static abort(requestId: string): void {
    ClassifierPageBridge.request(ClassifierRuntimeOp.ABORT, { requestId }).catch(() => undefined);
  }
}
