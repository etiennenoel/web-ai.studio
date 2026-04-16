import { WindowMessageType } from '../enums/window-message-type.enum';

/**
 * Extracts the duplicated "send postMessage + listen for messageId-correlated response"
 * pattern into a single reusable method.
 *
 * This pattern appears 6+ times across injected.ts and main.ts. Each instance:
 * 1. Generates a unique messageId
 * 2. Registers a window message listener filtered by response type + messageId
 * 3. Posts a request message with that messageId
 * 4. Resolves/rejects a promise when the matching response arrives
 *
 * WindowMessageBridge consolidates all of that into one static call.
 */
export class WindowMessageBridge {
  /**
   * Sends a request via window.postMessage and returns a Promise that resolves
   * when a matching response (same messageId, expected response type) arrives.
   *
   * @param requestType - The WindowMessageType for the outgoing request.
   * @param responseType - The WindowMessageType to listen for as the response.
   * @param payload - Optional additional fields merged into the request message.
   * @param timeoutMs - Maximum time to wait for a response before rejecting (default: 10s).
   * @returns A promise that resolves with the response message's data.
   */
  static sendRequest<TResponse = unknown>(
    requestType: WindowMessageType,
    responseType: WindowMessageType,
    payload?: Record<string, unknown>,
    timeoutMs: number = 10_000,
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      const messageId = `webai-${Date.now()}-${Math.random()}`;

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const listener = (event: MessageEvent) => {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== responseType || event.data.messageId !== messageId) return;

        // Cleanup before resolving/rejecting
        window.removeEventListener('message', listener);
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);

        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.data as TResponse);
        }
      };

      window.addEventListener('message', listener);

      // Post the request with the generated messageId
      window.postMessage({
        type: requestType,
        messageId,
        ...payload,
      }, '*');

      // Guard against responses that never arrive (e.g., content script not loaded)
      timeoutHandle = setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error(`WindowMessageBridge: Timed out waiting for ${responseType} (request: ${requestType})`));
      }, timeoutMs);
    });
  }
}
