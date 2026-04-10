import { ProviderConfig } from '../../../shared/interfaces/provider-config.interface';
import { ProviderRequestPayload } from '../../../shared/interfaces/window-messages.interface';
import { ProviderClient } from './provider-client.interface';

/**
 * Sends API calls to an OpenAI-compatible endpoint.
 *
 * Works with the standard OpenAI API, Azure OpenAI, and local LLM servers
 * (LM Studio, Ollama, etc.) that implement the /v1/chat/completions format.
 *
 * Handles the translation between Chrome AI API call formats and the
 * OpenAI chat completions request format.
 */
export class OpenAiProviderClient implements ProviderClient {
  async execute(payload: ProviderRequestPayload, provider: ProviderConfig): Promise<string> {
    const endpointUrl = provider.endpointUrl;
    if (!endpointUrl) {
      throw new Error('Endpoint URL is missing for this OpenAI provider.');
    }

    const rawArg = payload.args && Array.isArray(payload.args) && payload.args.length > 0
      ? (payload.args as any[])[0]
      : '';

    const fallbackText = typeof rawArg === 'string' ? rawArg : JSON.stringify(rawArg);
    let messages = this.buildMessages(rawArg, provider.systemPrompt);

    // Task-specific APIs get a prompt wrapper
    messages = this.applyTaskPromptIfNeeded(payload.api, fallbackText, messages, provider.systemPrompt);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    const body: Record<string, unknown> = {
      messages,
      temperature: 0.7,
      stream: false,
      model: provider.modelId || 'local-model',
    };

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Local Provider Error: ${res.status} ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Converts the raw argument into OpenAI chat completion messages format.
   * Prepends the system prompt if configured.
   */
  private buildMessages(rawArg: unknown, systemPrompt?: string): any[] {
    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (typeof rawArg === 'string') {
      messages.push({ role: 'user', content: rawArg });
    } else if (Array.isArray(rawArg)) {
      for (const msg of rawArg) {
        const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : msg.role;
        if (typeof msg.content === 'string') {
          messages.push({ role, content: msg.content });
        } else if (Array.isArray(msg.content)) {
          const content = this.buildContentParts(msg.content);
          messages.push({ role, content });
        } else {
          messages.push({ role, content: JSON.stringify(msg.content) });
        }
      }
    } else if (typeof rawArg === 'object') {
      messages.push({ role: 'user', content: JSON.stringify(rawArg) });
    }

    return messages;
  }

  /**
   * Converts Chrome AI content items into OpenAI's multimodal content format.
   * Handles text, image (via image_url), and audio (via input_audio).
   */
  private buildContentParts(contentItems: any[]): any[] {
    return contentItems.map((item: any) => {
      if (item.type === 'text') {
        return { type: 'text', text: item.value || '' };
      }

      if (item.type === 'image' && item.value?.dataUrl) {
        return {
          type: 'image_url',
          image_url: { url: item.value.dataUrl },
        };
      }

      if (item.type === 'audio' && item.value?.dataUrl) {
        const dataUrl: string = item.value.dataUrl;
        const splitDataUrl = dataUrl.split(',');
        if (splitDataUrl.length === 2) {
          const mimeMatch = splitDataUrl[0].match(/:(.*?);/);
          const format = mimeMatch ? mimeMatch[1].split('/')[1] : 'wav';
          return {
            type: 'input_audio',
            input_audio: { data: splitDataUrl[1], format },
          };
        }
      }

      // Fallback: treat as text
      return { type: 'text', text: JSON.stringify(item) };
    });
  }

  /**
   * For task-specific APIs, wraps the input in a task-appropriate prompt
   * and ensures the system prompt is preserved.
   */
  private applyTaskPromptIfNeeded(
    api: string,
    fallbackText: string,
    messages: any[],
    systemPrompt?: string,
  ): any[] {
    const taskPrompts: Record<string, string> = {
      Summarizer: `Summarize the following text:\n\n${fallbackText}`,
      Writer: `Write about the following topic:\n\n${fallbackText}`,
      Rewriter: `Rewrite the following text:\n\n${fallbackText}`,
      Translator: `Translate the following text:\n\n${fallbackText}`,
    };

    if (api in taskPrompts) {
      const result: any[] = [{ role: 'user', content: taskPrompts[api] }];

      // Ensure system prompt is first if configured
      if (systemPrompt) {
        result.unshift({ role: 'system', content: systemPrompt });
      }

      return result;
    }

    return messages;
  }
}
