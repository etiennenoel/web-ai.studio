/**
 * Message types for communication between the injected script (page context)
 * and the content script (isolated world) via window.postMessage.
 *
 * Request/response pairs are correlated by a `messageId` field.
 * The API_CALL type is one-way (fire-and-forget from injected to content script).
 */
export enum WindowMessageType {
  /** One-way: injected -> content script. Logs an API call lifecycle event. */
  API_CALL = 'WEBAI_API_CALL',

  /** Request hardware information (WebGL, WebGPU, CPU, memory). */
  HW_INFO_REQUEST = 'WEBAI_HW_INFO_REQUEST',
  HW_INFO_RESPONSE = 'WEBAI_HW_INFO_RESPONSE',

  /** Request evaluation of which Chrome AI APIs are available on the page. */
  DIAGNOSIS_EVAL_REQUEST = 'WEBAI_DIAGNOSIS_EVAL_REQUEST',
  DIAGNOSIS_EVAL_RESPONSE = 'WEBAI_DIAGNOSIS_EVAL_RESPONSE',

  /** Request API call history from IndexedDB. */
  GET_HISTORY_REQUEST = 'WEBAI_GET_HISTORY',
  GET_HISTORY_RESPONSE = 'WEBAI_GET_HISTORY_RESPONSE',

  /** Request the active model routing provider (chrome, gemini, openai). */
  ROUTING_REQUEST = 'WEBAI_ROUTING_REQUEST',
  ROUTING_RESPONSE = 'WEBAI_ROUTING_RESPONSE',

  /** Request an external provider (Gemini/OpenAI) to handle an API call. */
  PROVIDER_REQUEST = 'WEBAI_GEMINI_REQUEST',
  PROVIDER_RESPONSE = 'WEBAI_GEMINI_RESPONSE',
}
