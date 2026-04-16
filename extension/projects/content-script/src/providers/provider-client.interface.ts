import { ProviderConfig } from '../../../shared/interfaces/provider-config.interface';
import { ProviderRequestPayload } from '../../../shared/interfaces/window-messages.interface';

/**
 * Interface for external AI provider clients.
 *
 * Each implementation knows how to format requests for and parse responses from
 * a specific provider type (Gemini, OpenAI-compatible).
 */
export interface ProviderClient {
  /**
   * Sends the API call to the external provider and returns the text response.
   *
   * @param payload - Contains the API name, method name, and sanitized arguments.
   * @param provider - The provider configuration (API key, endpoint, model ID, etc.).
   * @returns The text response from the provider.
   * @throws If the API call fails or the response is not ok.
   */
  execute(payload: ProviderRequestPayload, provider: ProviderConfig): Promise<string>;
}
