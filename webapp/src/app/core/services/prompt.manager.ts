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
    const optionLines: string[] = [];
    if (options.samplingMode) {
      optionLines.push(`    samplingMode: "${options.samplingMode}",`);
    }
    if (options.systemPrompt) {
      optionLines.push(`    initialPrompts: [{ role: "system", content: ${JSON.stringify(options.systemPrompt)} }],`);
    }
    if (options.temperature !== null && options.temperature !== undefined) {
      optionLines.push(`    temperature: ${options.temperature}, // Deprecated`);
    }
    if (options.topK !== null && options.topK !== undefined) {
      optionLines.push(`    topK: ${options.topK}, // Deprecated`);
    }

    return `// Check availability
const availability = await LanguageModel.availability({
  samplingMode: "${options.samplingMode || 'balanced'}"
});

if (availability !== "unavailable") {
  const session = await LanguageModel.create({
${optionLines.join('\n')}
  });

  const stream = session.promptStreaming("Your prompt here");
  for await (const chunk of stream) {
    console.log(chunk);
  }
}`;
  }
}
