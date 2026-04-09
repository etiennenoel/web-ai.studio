import { ProviderConfig } from '../../../shared/interfaces/provider-config.interface';
import { ProviderRequestPayload } from '../../../shared/interfaces/window-messages.interface';
import { ProviderClient } from './provider-client.interface';

/**
 * Sends API calls to the Google Gemini API (generativelanguage.googleapis.com).
 *
 * Handles the translation between Chrome AI API call formats and Gemini's
 * generateContent request format, including:
 * - String prompts -> single user message
 * - Array-of-messages -> multi-turn conversation
 * - Multimodal content (images/audio as inline data)
 * - Task-specific APIs (Summarizer, Writer, Rewriter, Translator) -> prompt wrappers
 */
export class GeminiProviderClient implements ProviderClient {
  async execute(payload: ProviderRequestPayload, provider: ProviderConfig): Promise<string> {
    const apiKey = provider.apiKey || '';
    if (!apiKey) {
      throw new Error('Gemini API Key is missing for this provider.');
    }

    const rawArg = payload.args && Array.isArray(payload.args) && payload.args.length > 0
      ? (payload.args as any[])[0]
      : '';

    const fallbackText = typeof rawArg === 'string' ? rawArg : JSON.stringify(rawArg);
    let contents = this.buildContents(rawArg);

    // Task-specific APIs get a prompt wrapper to guide the model
    contents = this.applyTaskPromptIfNeeded(payload.api, fallbackText, contents);

    const modelId = provider.modelId || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API Error: ${res.status} ${errBody}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Converts the raw argument from the Chrome AI API call into Gemini's
   * contents format (array of { role, parts } objects).
   */
  private buildContents(rawArg: unknown): any[] {
    if (typeof rawArg === 'string') {
      return [{ role: 'user', parts: [{ text: rawArg }] }];
    }

    if (Array.isArray(rawArg)) {
      return rawArg.map((msg: any) => {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const parts = this.buildParts(msg.content);
        return { role, parts };
      });
    }

    if (typeof rawArg === 'object') {
      return [{ role: 'user', parts: [{ text: JSON.stringify(rawArg) }] }];
    }

    return [{ role: 'user', parts: [{ text: '' }] }];
  }

  /**
   * Converts message content (string, array of content items, or object)
   * into Gemini's parts format.
   */
  private buildParts(content: unknown): any[] {
    if (typeof content === 'string') {
      return [{ text: content }];
    }

    if (Array.isArray(content)) {
      return content.map((item: any) => {
        if (item.type === 'text') {
          return { text: item.value || '' };
        }

        // Image or audio with a data URL -> inline data for Gemini
        if ((item.type === 'image' || item.type === 'audio') && item.value?.dataUrl) {
          const dataUrl: string = item.value.dataUrl;
          const splitDataUrl = dataUrl.split(',');
          if (splitDataUrl.length === 2) {
            const mimeMatch = splitDataUrl[0].match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : item.value.type;
            return { inlineData: { mimeType, data: splitDataUrl[1] } };
          }
        }

        // Fallback: serialize as text
        return { text: JSON.stringify(item) };
      });
    }

    return [{ text: JSON.stringify(content) }];
  }

  /**
   * For task-specific APIs (Summarizer, Writer, Rewriter, Translator),
   * wraps the input in a task-appropriate prompt since these APIs have
   * a specific purpose that the generic Gemini model needs to be told about.
   */
  private applyTaskPromptIfNeeded(api: string, fallbackText: string, contents: any[]): any[] {
    const taskPrompts: Record<string, string> = {
      Summarizer: `Summarize the following text:\n\n${fallbackText}`,
      Writer: `Write about the following topic:\n\n${fallbackText}`,
      Rewriter: `Rewrite the following text:\n\n${fallbackText}`,
      Translator: `Translate the following text:\n\n${fallbackText}`,
    };

    if (api in taskPrompts) {
      return [{ role: 'user', parts: [{ text: taskPrompts[api] }] }];
    }

    return contents;
  }
}
