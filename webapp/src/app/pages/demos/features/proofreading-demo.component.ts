import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;
declare const Proofreader: any;

@Component({
  selector: 'app-proofreading-demo',
  template: `
    <app-demo-layout 
      [title]="demo.title" 
      [description]="demo.description" 
      [icon]="demo.icon" 
      [category]="demo.category" 
      [onDeviceReason]="demo.onDeviceReason" 
      [codeSnippet]="dynamicCodeSnippet"
      [ttft]="ttft"
      [totalTime]="totalTime">
      <div demo-ui>
        
        <div class="mb-4 flex items-center justify-between">
          <div class="inline-flex bg-slate-200/50 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button class="px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none outline-none focus:outline-none"
                    [ngClass]="apiChoice === 'proofreader' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'proofreader'">
              Proofreader API
            </button>
            <button class="px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none outline-none focus:outline-none"
                    [ngClass]="apiChoice === 'prompt' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'prompt'">
              Prompt API
            </button>
          </div>
          
          <div class="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            Status: 
            @if (apiAvailabilityStatus === 'available') {
              <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="bi bi-check-circle-fill"></i> Available</span>
            } @else if (apiAvailabilityStatus === 'unavailable') {
              <span class="text-red-600 dark:text-red-400 flex items-center gap-1"><i class="bi bi-x-circle-fill"></i> Unavailable</span>
            } @else {
              <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1"><i class="bi bi-arrow-down-circle-fill"></i> Download Required</span>
            }
          </div>
        </div>

        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row min-h-[400px] overflow-hidden relative">
          
          <!-- Source -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-700/80">
            <div class="px-5 py-3 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/30 flex justify-between items-center">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i class="bi bi-x-circle text-red-500"></i> Original Text
              </span>
            </div>
            <textarea class="w-full flex-grow bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none text-lg p-5 pb-20 leading-relaxed font-serif" 
                      [(ngModel)]="sourceText" 
                      placeholder="Type text with some grammar mistakes..."></textarea>
            
            <div class="absolute bottom-0 left-0 right-0 p-4 flex justify-end pointer-events-none">
              @if (state === 'Inferencing') {
                <button class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none pointer-events-auto"
                        (click)="onCancelProofread()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop
                </button>
              } @else {
                <button class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none pointer-events-auto" 
                        (click)="proofread()"
                        [disabled]="!sourceText.trim() || apiAvailabilityStatus === 'unavailable'">
                  <i class="bi bi-spellcheck text-lg"></i> Proofread
                </button>
              }
            </div>
          </div>

          <!-- Destination (Corrected) -->
          <div class="flex-1 flex flex-col bg-emerald-50/20 dark:bg-emerald-900/5 relative">
            <div class="px-5 py-3 border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 flex justify-between items-center">
              <span class="text-sm font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <i class="bi bi-check-circle text-emerald-500"></i> Corrected Text
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            
            <div class="w-full flex-grow text-slate-800 dark:text-slate-200 text-lg p-5 leading-relaxed overflow-y-auto break-words font-serif relative">
              @if(correctedText) {
                <!-- Render corrected text -->
                <div class="prose prose-sm dark:prose-invert text-slate-800 dark:text-slate-200 relative z-10 whitespace-pre-wrap">
                  {{ correctedText }}
                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <i class="bi bi-pencil-square text-4xl mb-3 text-slate-400"></i>
                  <p class="text-sm text-slate-500">The corrected text will appear here.</p>
                </div>
              }
            </div>
          </div>

        </div>
      </div>
    </app-demo-layout>
  `,
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
