import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PromptRunOptions } from '../models/prompt-run.options';
import { InferenceStateEnum } from '../enums/inference-state.enum';

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

  async createAndLoadSession(options: PromptRunOptions) {
    if (this.session) {
      try {
        this.session.destroy();
      } catch (e) {
        console.warn('Error destroying session', e);
      }
    }

    try {
      // @ts-ignore
      if (window.ai && window.ai.languageModel) {
         // @ts-ignore
        this.session = await window.ai.languageModel.create({
          systemPrompt: options.systemPrompt,
          temperature: options.temperature,
          topK: options.topK
        });
      }
    } catch (e) {
      console.error('Failed to create session', e);
    }
  }

  async run(prompt: string) {
    if (!this.session) {
      console.error('No session available');
      return;
    }

    this.addMessage({ role: 'user', content: prompt });
    this._status.next(InferenceStateEnum.InProgress);

    try {
      const response = await this.session.prompt(prompt);
      this.addMessage({ role: 'model', content: response });
      this._status.next(InferenceStateEnum.Success);
    } catch (e) {
      console.error('Prompt failed', e);
      this._status.next(InferenceStateEnum.Error);
    }
  }

  cancel() {
    // Cancellation logic if supported by API (using AbortController)
    // For now, just reset status
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
