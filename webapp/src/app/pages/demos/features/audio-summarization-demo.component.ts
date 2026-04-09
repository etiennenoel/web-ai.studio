import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-audio-summarization-demo',
  templateUrl: './audio-summarization-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class AudioSummarizationDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'audio-summarization')!;
  
  sourceText = '';
  extractedText = '';
  
  audioFile: File | null = null;
  audioUrl: string | null = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability([{ type: "text" }, { type: "audio" }]);
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `const session = await LanguageModel.create({
  systemPrompt: "${escapedPrompt}",
  expectedInputs: [{ type: "audio", languages: ["en"] }]
});

const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Summarize this audio clip." },
    { type: "audio", value: audioFile }
  ]
}]);
console.log(result);`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('audio/')) {
        this.audioFile = file;
        this.audioUrl = URL.createObjectURL(file);
      }
    }
  }

  clearAudio() {
    this.audioFile = null;
    this.audioUrl = null;
  }

  async processAudio() {
    if (!this.audioFile) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: this.sourceText,
        expectedInputs: [{ type: "audio", languages: ["en"] }]
      });
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "text", value: "Please summarize this audio clip according to the system instructions." },
          { type: "audio", value: this.audioFile }
        ]
      }];
      
      const stream = session.promptStreaming(promptInput, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.extractedText += chunk;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.extractedText = 'Error generating summary: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelGenerate() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
