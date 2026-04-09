import { ApiCallStage } from '../enums/api-call-stage.enum';

/**
 * Payload for an API call lifecycle event.
 * Sent from the injected script to the content script via WEBAI_API_CALL,
 * then forwarded to the service worker for persistence in IndexedDB.
 */
export interface ApiCallPayload {
  /** Unique identifier for this specific method call (e.g., a single prompt() invocation). */
  id: string;

  /**
   * Session identifier linking related calls together.
   * For create() calls, sessionId === id.
   * For subsequent method calls, sessionId matches the create() call's id.
   */
  sessionId: string;

  /** Which Chrome AI API this call belongs to (e.g., "LanguageModel", "Summarizer"). */
  api: string;

  /** The method name that was called (e.g., "create", "prompt", "summarize"). */
  method: string;

  /** Current lifecycle stage of this call. */
  stage: ApiCallStage;

  /** Origin of the page that initiated the API call. */
  origin: string;

  /** Timestamp (ms since epoch) when this stage occurred. */
  timestamp: number;

  /** Sanitized options passed to .create() (only present on CREATE stage). */
  options?: unknown;

  /** Sanitized arguments passed to the method (only present on EXECUTE stage). */
  args?: unknown;

  /** Sanitized response returned by the method (only present on COMPLETED stage). */
  response?: unknown;

  /** Error message if the call failed (only present on ERROR stage). */
  errorMessage?: string;

  /** Character count of the primary input argument (only present on EXECUTE stage). */
  inputLength?: number;

  /** Token count from measureInputUsage() (only present on INPUT_USAGE stage). */
  inputTokenCount?: number;
}
