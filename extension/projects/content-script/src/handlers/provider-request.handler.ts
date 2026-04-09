import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { ProviderType } from '../../../shared/enums/provider-type.enum';
import { ProviderRequestMessage } from '../../../shared/interfaces/window-messages.interface';
import { ProviderConfig } from '../../../shared/interfaces/provider-config.interface';
import { WindowMessageHandler } from './window-message-handler.interface';
import { ProviderClient } from '../providers/provider-client.interface';
import { GeminiProviderClient } from '../providers/gemini-provider-client';
import { OpenAiProviderClient } from '../providers/openai-provider-client';

declare const chrome: any;

/**
 * Handles WEBAI_GEMINI_REQUEST (now called PROVIDER_REQUEST) by resolving the
 * active provider configuration and delegating to the appropriate provider client.
 *
 * The flow is:
 * 1. Fetch the active provider ID from settings
 * 2. Fetch the providers list from settings
 * 3. Find the matching provider config
 * 4. Delegate to GeminiProviderClient or OpenAiProviderClient based on provider type
 * 5. Post the response (or error) back via window.postMessage
 */
export class ProviderRequestHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.PROVIDER_REQUEST;

  private readonly providerClients: Record<string, ProviderClient> = {
    [ProviderType.GEMINI]: new GeminiProviderClient(),
    [ProviderType.OPENAI]: new OpenAiProviderClient(),
  };

  async handle(message: ProviderRequestMessage): Promise<void> {
    const messageId = message.messageId;
    const payload = message.payload;

    try {
      const provider = await this.resolveProvider();
      const client = this.providerClients[provider.type];

      if (!client) {
        throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      const text = await client.execute(payload, provider);
      window.postMessage({
        type: WindowMessageType.PROVIDER_RESPONSE,
        messageId,
        data: text,
      }, '*');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      window.postMessage({
        type: WindowMessageType.PROVIDER_RESPONSE,
        messageId,
        error: errorMessage,
      }, '*');
    }
  }

  /**
   * Fetches the active provider configuration from the service worker's settings.
   *
   * Two sequential settings lookups are needed:
   * 1. `activeProviderId` - which provider is currently selected
   * 2. `providers` - the full list of configured providers
   */
  private resolveProvider(): Promise<ProviderConfig> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: RuntimeMessageAction.GET_SETTING, key: 'activeProviderId', defaultValue: 'chrome' },
        (actResp: any) => {
          const activeProviderId = actResp?.value || 'chrome';

          chrome.runtime.sendMessage(
            { action: RuntimeMessageAction.GET_SETTING, key: 'providers', defaultValue: [] },
            (provResp: any) => {
              const providers: ProviderConfig[] = provResp?.value || [];
              const provider = providers.find((p) => p.id === activeProviderId);

              if (!provider) {
                reject(new Error(`Provider "${activeProviderId}" not found in configured providers.`));
                return;
              }

              resolve(provider);
            },
          );
        },
      );
    });
  }
}
