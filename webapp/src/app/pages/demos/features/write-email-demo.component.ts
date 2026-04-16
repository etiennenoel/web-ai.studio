import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const Writer: any;
declare const LanguageModel: any;

const systemPrompt = `You are an intelligent email writer. You are tasked to write ONLY the email body. Draft a polite and professional email based on the user's prompt. Do not include subject lines, just the body. Include only the email body. `;

@Component({
  selector: 'app-write-email-demo',
  templateUrl: './write-email-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class WriteEmailDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'write-email')!;
  
  _apiChoice: 'writer' | 'prompt' = 'writer';
  
  get apiChoice() { return this._apiChoice; }
  set apiChoice(val: 'writer' | 'prompt') {
    this._apiChoice = val;
    this.checkApiAvailability();
  }

  sourceText = '';
  emailBody = '';
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
      if (this.apiChoice === 'writer') {
        if ('Writer' in self && 'availability' in Writer) {
          this.apiAvailabilityStatus = await Writer.availability();
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
    
    if (this.apiChoice === 'writer') {
      return `const writer = await Writer.create({
  tone: "formal",
  length: "medium"
});

const stream = writer.writeStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  emailBodyTextarea.value = chunk;
}`;
    } else {
      return `const session = await LanguageModel.create({
  systemPrompt: "${systemPrompt}"
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  emailBodyTextarea.value += chunk;
}`;
    }
  }

  async draftEmail() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.emailBody = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      if (this.apiChoice === 'writer') {
        const writer = await Writer.create({ tone: 'formal', length: 'medium' });
        const stream = writer.writeStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.emailBody = chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
        
      } else {
        const session = await LanguageModel.create({
          systemPrompt,
        });
        
        const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.emailBody += chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.emailBody = 'Error drafting email: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelDraft() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
