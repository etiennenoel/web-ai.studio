import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const Rewriter: any;
declare const LanguageModel: any;

@Component({
  selector: 'app-tone-changer-demo',
  templateUrl: './tone-changer-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ToneChangerDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'tone-changer')!;
  
  _apiChoice: 'rewriter' | 'prompt' = 'rewriter';
  
  get apiChoice() { return this._apiChoice; }
  set apiChoice(val: 'rewriter' | 'prompt') {
    this._apiChoice = val;
    this.checkApiAvailability();
  }

  tones = [
    { id: 'more-formal', label: 'More Formal', icon: '👔' },
    { id: 'more-casual', label: 'More Casual', icon: '🏄' },
    { id: 'pirate', label: 'Pirate', icon: '🏴‍☠️' },
  ];
  selectedTone = 'more-formal';

  sourceText = '';
  rewrittenText = '';
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
      if (this.apiChoice === 'rewriter') {
        if ('Rewriter' in self && 'availability' in Rewriter) {
          this.apiAvailabilityStatus = await Rewriter.availability();
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
    
    if (this.apiChoice === 'rewriter') {
      const isStandardTone = this.selectedTone === 'more-formal' || this.selectedTone === 'more-casual';
      const toneArg = isStandardTone ? `tone: "${this.selectedTone}"` : `tone: "as-is", sharedContext: "Rewrite this as a ${this.selectedTone}"`;
      
      return `const rewriter = await Rewriter.create({
  ${toneArg}
});

const result = await rewriter.rewrite("${escapedPrompt}");
console.log(result);`;
    } else {
      const toneLabel = this.tones.find(t => t.id === this.selectedTone)?.label || 'Formal';
      return `const session = await LanguageModel.create({
  systemPrompt: "Rewrite the following text to sound ${toneLabel}."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  console.log(chunk);
}`;
    }
  }

  async rewrite() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.rewrittenText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      if (this.apiChoice === 'rewriter') {
        const isStandardTone = this.selectedTone === 'more-formal' || this.selectedTone === 'more-casual';
        const options: any = isStandardTone ? { tone: this.selectedTone } : { sharedContext: `Rewrite this as a ${this.selectedTone}` };
        
        const rewriter = await Rewriter.create(options);
        const stream = rewriter.rewriteStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.rewrittenText = chunk; // Rewriter API usually replaces/progressive string
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
        
      } else {
        const toneLabel = this.tones.find(t => t.id === this.selectedTone)?.label || 'Formal';
        const session = await LanguageModel.create({
          systemPrompt: `Rewrite the following text to sound ${toneLabel}.`
        });
        
        const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.rewrittenText += chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.rewrittenText = 'Error executing rewrite: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelRewrite() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
