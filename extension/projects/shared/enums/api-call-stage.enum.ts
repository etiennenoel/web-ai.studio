/**
 * Stages in the lifecycle of a tracked Chrome AI API call.
 *
 * A typical non-streaming call goes through: CREATE -> EXECUTE -> COMPLETED (or ERROR).
 * A streaming call goes through: CREATE -> EXECUTE -> FIRST_TOKEN -> COMPLETED (or ERROR).
 * INPUT_USAGE is emitted asynchronously when measureInputUsage resolves.
 */
export enum ApiCallStage {
  /** The API's .create() factory was called. */
  CREATE = 'create',

  /** A method on the API instance was invoked (e.g., prompt, summarize). */
  EXECUTE = 'execute',

  /** The first chunk arrived from a streaming response. */
  FIRST_TOKEN = 'first_token',

  /** The operation completed successfully. */
  COMPLETED = 'completed',

  /** The operation threw an error. */
  ERROR = 'error',

  /** Token usage measurement was resolved via measureInputUsage(). */
  INPUT_USAGE = 'input_usage',
}
