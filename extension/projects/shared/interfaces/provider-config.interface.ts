import { ProviderType } from '../enums/provider-type.enum';

/**
 * Configuration for a model routing provider.
 * Stored in the extension's settings and used to determine
 * how API calls are handled when routing is not set to Chrome.
 */
export interface ProviderConfig {
  /** Unique identifier for this provider entry. */
  id: string;

  /** What kind of backend this provider connects to. */
  type: ProviderType;

  /** API key for authentication (Gemini API key or OpenAI-compatible key). */
  apiKey?: string;

  /** Endpoint URL for OpenAI-compatible providers (e.g., http://localhost:1234/v1/chat/completions). */
  endpointUrl?: string;

  /** Model identifier (e.g., "gemini-1.5-flash", "gpt-4", "local-model"). */
  modelId?: string;

  /** System prompt prepended to OpenAI-compatible requests. */
  systemPrompt?: string;
}
