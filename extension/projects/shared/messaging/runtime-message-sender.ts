import { RuntimeMessage } from '../interfaces/runtime-messages.interface';

declare const chrome: {
  runtime: {
    sendMessage: (message: unknown, callback: (response: unknown) => void) => void;
    lastError: { message: string } | null | undefined;
  };
};

/**
 * Wraps chrome.runtime.sendMessage in a typed, promise-based API.
 *
 * Why this exists: chrome.runtime.sendMessage uses callbacks and has no type safety.
 * Every call site had to manually check chrome.runtime.lastError and cast responses.
 * This class centralizes that error handling and provides generic typing.
 */
export class RuntimeMessageSender {
  /**
   * Sends a typed chrome.runtime message to the service worker and returns
   * a promise that resolves with the response.
   *
   * @param message - A strongly-typed RuntimeMessage.
   * @returns The service worker's response, cast to TResponse.
   * @throws If chrome.runtime.lastError is set or the response contains an error field.
   */
  static send<TResponse = unknown>(message: RuntimeMessage): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: unknown) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const res = response as Record<string, unknown> | undefined;
        if (res && typeof res.error === 'string') {
          reject(new Error(res.error));
          return;
        }

        resolve(response as TResponse);
      });
    });
  }
}
