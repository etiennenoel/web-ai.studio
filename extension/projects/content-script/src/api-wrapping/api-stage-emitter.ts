import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { ApiCallStage } from '../../../shared/enums/api-call-stage.enum';
import { ApiCallPayload } from '../../../shared/interfaces/api-call-payload.interface';

/**
 * Emits API call lifecycle stages as window messages for the content script
 * to forward to the service worker.
 *
 * Each Chrome AI API wrapper creates one ApiStageEmitter instance, bound to
 * that API's name. The emitter is called at each stage of a method call's
 * lifecycle (create, execute, first_token, completed, error, input_usage).
 */
export class ApiStageEmitter {
  constructor(private readonly apiName: string) {}

  /**
   * Posts an API_CALL window message with the given lifecycle stage.
   *
   * @param callId - Unique ID for this specific method invocation.
   * @param sessionId - Session ID linking related calls (matches create()'s callId).
   * @param method - Name of the API method (e.g., "prompt", "summarize").
   * @param stage - Current lifecycle stage.
   * @param extra - Additional fields merged into the payload (e.g., args, response, errorMessage).
   */
  emit(
    callId: string,
    sessionId: string,
    method: string,
    stage: ApiCallStage,
    extra: Partial<ApiCallPayload> = {},
  ): void {
    try {
      const payload: ApiCallPayload = {
        id: callId,
        sessionId,
        api: this.apiName,
        method,
        stage,
        origin: window.location.origin,
        timestamp: Date.now(),
        ...extra,
      };

      window.postMessage({ type: WindowMessageType.API_CALL, payload }, '*');
    } catch (e) {
      console.warn('WebAI Extension: Could not send API call log', e);
    }
  }
}
