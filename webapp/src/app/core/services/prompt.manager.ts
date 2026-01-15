import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PromptRunOptions } from '../models/prompt-run.options';

@Injectable({
  providedIn: 'root'
})
export class PromptManager {
  private _prompt = new BehaviorSubject<string>('');
  public prompt$ = this._prompt.asObservable();

  setPrompt(prompt: string) {
    this._prompt.next(prompt);
  }

  getPrompt(): string {
    return this._prompt.value;
  }

  getCode(options: PromptRunOptions, isStream: boolean, language: "typescript" | "javascript"): string {
    // Basic implementation for demonstration
    const declaration = language === 'typescript' ? 'const session = await LanguageModel.create({' : 'const session = await LanguageModel.create({';
    return `
// Check availability
const availability = await LanguageModel.availability();

if (availability !== "no") {
  ${declaration}
    systemPrompt: "${options.systemPrompt}",
    temperature: ${options.temperature},
    topK: ${options.topK}
  });

  const stream = session.promptStreaming("Your prompt here");
  for await (const chunk of stream) {
    console.log(chunk);
  }
}`;
  }
}
