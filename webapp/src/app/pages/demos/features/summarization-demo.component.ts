import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const Summarizer: any;
declare const LanguageModel: any;

@Component({
  selector: 'app-summarization-demo',
  templateUrl: './summarization-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SummarizationDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'summarization')!;
  
  _apiChoice: 'summarizer' | 'prompt' = 'summarizer';
  summaryType: 'key-points' | 'tl;dr' | 'teaser' | 'headline' = 'key-points';
  
  get apiChoice() { return this._apiChoice; }
  set apiChoice(val: 'summarizer' | 'prompt') {
    this._apiChoice = val;
    this.checkApiAvailability();
  }

  sourceText = '';
  summaryText = '';
  apiAvailabilityStatus: 'loading...' | 'available' | 'downloading' | 'downloadable' | 'unavailable' | 'unknown' = 'loading...';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkApiAvailability();
  }

  async checkApiAvailability() {
    this.apiAvailabilityStatus = 'loading...';
    try {
      if (this.apiChoice === 'summarizer') {
        if ('Summarizer' in self && 'availability' in Summarizer) {
          this.apiAvailabilityStatus = await Summarizer.availability();
        } else {
          this.apiAvailabilityStatus = 'unavailable';
        }
      } else {
        if ('LanguageModel' in self && 'availability' in LanguageModel) {
          this.apiAvailabilityStatus = await LanguageModel.availability();
        } else {
          this.apiAvailabilityStatus = 'unavailable';
        }
      }
    } catch(e) {
      this.apiAvailabilityStatus = 'unavailable';
    }
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    if (this.apiChoice === 'summarizer') {
      return `const summarizer = await Summarizer.create({
  type: "${this.summaryType}"
});

const result = await summarizer.summarize("${escapedPrompt}");
console.log(result);`;
    } else {
      return `const session = await LanguageModel.create({
  systemPrompt: "Summarize the text into 3 concise bullet points."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  console.log(chunk);
}`;
    }
  }

  async summarize() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.summaryText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      if (this.apiChoice === 'summarizer') {
        const summarizer = await Summarizer.create({ type: this.summaryType });
        const stream = summarizer.summarizeStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.summaryText = chunk; // Summarizer API replaces chunks, usually doesn't append depending on the implementation, but let's append if it's a true stream, or replace if it's a progressive string. Actually Built-in AI streaming usually returns the full string up to that point. So we assign it.
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
        
      } else {
        const session = await LanguageModel.create({
          systemPrompt: "Summarize the text into 3 concise bullet points."
        });
        
        const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.summaryText += chunk; // LanguageModel API streams chunks.
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.summaryText = 'Error executing summarization: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelSummarization() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
