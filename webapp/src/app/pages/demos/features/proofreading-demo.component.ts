import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;
declare const Proofreader: any;

@Component({
  selector: 'app-proofreading-demo',
  templateUrl: './proofreading-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ProofreadingDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'proofreading')!;
  
  _apiChoice: 'proofreader' | 'prompt' = 'proofreader';
  
  get apiChoice() { return this._apiChoice; }
  set apiChoice(val: 'proofreader' | 'prompt') {
    this._apiChoice = val;
    this.checkApiAvailability();
  }

  sourceText = '';
  correctedText = '';
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
      if (this.apiChoice === 'proofreader') {
        if ('Proofreader' in self && 'availability' in Proofreader) {
          this.apiAvailabilityStatus = await Proofreader.availability();
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
    
    if (this.apiChoice === 'proofreader') {
      return `const proofreader = await Proofreader.create();

const result = await proofreader.proofread("${escapedPrompt}");
console.log("Corrected:", result.correctedInput);
// result.corrections contains the exact list of edits`;
    } else {
      return `const session = await LanguageModel.create({
  systemPrompt: "Proofread the text. Fix grammar, spelling, and punctuation errors. Only output the corrected text."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  console.log(chunk);
}`;
    }
  }

  async proofread() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.correctedText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      if (this.apiChoice === 'proofreader') {
        const proofreader = await Proofreader.create();
        // Proofreader API returns a Promise of ProofreadResult, not a stream
        const result = await proofreader.proofread(this.sourceText, { signal: this.abortController.signal });
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
        this.ttft = this.totalTime; // No TTFT since it's not streaming
        
        this.correctedText = result.correctedInput;
      } else {
        const session = await LanguageModel.create({
          systemPrompt: "Proofread the text. Fix grammar, spelling, and punctuation errors. Only output the corrected text."
        });
        
        const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.correctedText += chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.correctedText = 'Error executing proofread: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelProofread() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
