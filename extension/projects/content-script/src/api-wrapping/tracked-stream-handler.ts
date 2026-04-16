import { ApiCallStage } from '../../../shared/enums/api-call-stage.enum';
import { ApiStageEmitter } from './api-stage-emitter';

/**
 * Wraps a ReadableStream to track first_token and completed stages
 * while passing through chunks transparently to the consumer.
 *
 * Why this exists: When a Chrome AI API returns a streaming response
 * (e.g., promptStreaming()), we need to intercept the stream to:
 * 1. Detect when the first chunk arrives (FIRST_TOKEN stage)
 * 2. Accumulate the full response text
 * 3. Emit a COMPLETED stage with the full response when the stream ends
 * 4. Emit an ERROR stage if reading fails
 *
 * The wrapped stream behaves identically to the original from the consumer's
 * perspective - all chunks are forwarded unchanged.
 */
export class TrackedStreamHandler {
  constructor(private readonly emitter: ApiStageEmitter) {}

  /**
   * Creates a new ReadableStream that wraps the original and emits
   * lifecycle stages as chunks flow through.
   *
   * @param stream - The original ReadableStream to wrap.
   * @param callId - Unique ID for this method call.
   * @param sessionId - Session ID linking to the create() call.
   * @param method - Name of the streaming method (e.g., "promptStreaming").
   * @returns A new ReadableStream that emits telemetry while passing data through.
   */
  wrap(stream: ReadableStream, callId: string, sessionId: string, method: string): ReadableStream {
    const reader = stream.getReader();
    let firstTokenSeen = false;
    let accumulatedResponse = '';

    return new ReadableStream({
      pull: async (controller) => {
        try {
          const { done, value } = await reader.read();

          if (done) {
            this.emitter.emit(callId, sessionId, method, ApiCallStage.COMPLETED, {
              response: accumulatedResponse,
            });
            controller.close();
          } else {
            if (!firstTokenSeen) {
              firstTokenSeen = true;
              this.emitter.emit(callId, sessionId, method, ApiCallStage.FIRST_TOKEN);
            }

            if (typeof value === 'string') {
              accumulatedResponse += value;
            }

            controller.enqueue(value);
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.emitter.emit(callId, sessionId, method, ApiCallStage.ERROR, { errorMessage });
          controller.error(err);
        }
      },

      cancel: (reason) => {
        stream.cancel(reason);
      },
    });
  }
}
