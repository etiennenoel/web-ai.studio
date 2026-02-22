import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PromptRunOptions } from '../models/prompt-run.options';
import { InferenceStateEnum } from '../enums/inference-state.enum';

declare const LanguageModel: any;

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConversationManager {
  private _messages = new BehaviorSubject<Message[]>([]);
  public messages$ = this._messages.asObservable();

  private _status = new BehaviorSubject<InferenceStateEnum>(InferenceStateEnum.Initial);
  public status$ = this._status.asObservable();

  private session: any;
  private abortController: AbortController | null = null;

  async createAndLoadSession(options: PromptRunOptions) {
    if (this.session) {
      try {
        this.session.destroy();
      } catch (e) {
        console.warn('Error destroying session', e);
      }
    }

    try {
      if ('LanguageModel' in self) {
        this.session = await LanguageModel.create({
          systemPrompt: options.systemPrompt,
          temperature: options.temperature,
          topK: options.topK,
          expectedInputs: options.expectedInputs,
        });
      }
    } catch (e) {
      console.error('Failed to create session', e);
    }
  }

  async run(options: PromptRunOptions) {
    if (!this.session) {
      console.error('No session available');
      return;
    }

    // Cancel any ongoing request
    if (this.abortController) {
      this.cancel();
    }

    this.addMessage({ role: 'user', content: options.prompt });
    this._status.next(InferenceStateEnum.InProgress);

    const currentAbortController = new AbortController();
    this.abortController = currentAbortController;

    try {
      if (options.stream) {
        let fullResponse = '';
        this.addMessage({ role: 'model', content: '' }); // Add empty message for streaming

        const stream = this.session.promptStreaming(options.prompt, {
          signal: currentAbortController.signal
        });
        
        for await (const chunk of stream) {
          if (this.abortController !== currentAbortController) return;
          fullResponse += chunk;
          // Update the last message with the new chunk
          const currentMessages = this._messages.value;
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.content = fullResponse;
            this._messages.next([...currentMessages]); // Trigger update
          }
        }
      } else {
        const response = await this.session.prompt(options.prompt, {
          signal: currentAbortController.signal
        });
        if (this.abortController !== currentAbortController) return;
        this.addMessage({ role: 'model', content: response });
      }

      if (this.abortController === currentAbortController) {
        this._status.next(InferenceStateEnum.Success);
      }
    } catch (e: any) {
      if (this.abortController === currentAbortController) {
        if (e.name === 'AbortError') {
          console.log('Prompt aborted');
        } else {
          console.error('Prompt failed', e);
          this._status.next(InferenceStateEnum.Error);
        }
      }
    } finally {
      if (this.abortController === currentAbortController) {
        this.abortController = null;
      }
    }
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this._status.next(InferenceStateEnum.Idle);
  }

  addMessage(message: Message) {
    const current = this._messages.value;
    this._messages.next([...current, message]);
  }

  clear() {
    this._messages.next([]);
  }
}
