/**
 * Model routing provider types.
 * Determines whether API calls are handled by Chrome's built-in AI
 * or forwarded to an external provider.
 */
export enum ProviderType {
  /** Use Chrome's built-in on-device AI model. */
  CHROME = 'chrome',

  /** Route calls to the Google Gemini API. */
  GEMINI = 'gemini',

  /** Route calls to an OpenAI-compatible endpoint (OpenAI, local LLM servers, etc.). */
  OPENAI = 'openai',
}
