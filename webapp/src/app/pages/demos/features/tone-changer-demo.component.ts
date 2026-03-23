import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const Rewriter: any;
declare const LanguageModel: any;

@Component({
  selector: 'app-tone-changer-demo',
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
                    [ngClass]="apiChoice === 'rewriter' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'rewriter'">
              Rewriter API
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

        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row min-h-[400px] overflow-hidden">
          
          <!-- Source -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-700/80">
            <div class="px-5 py-3 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-zinc-900/30 flex justify-between items-center">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i class="bi bi-pencil"></i> Rough Draft
              </span>
            </div>
            <textarea class="w-full flex-grow bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none text-lg p-5 pb-24 leading-relaxed" 
                      [(ngModel)]="sourceText" 
                      placeholder="Type a casual or rough draft..."></textarea>
            
            <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-zinc-700/50 bg-white dark:bg-zinc-800 flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 uppercase">Target Tone:</span>
                <div class="flex gap-1 overflow-x-auto hide-scrollbar">
                  @for (tone of tones; track tone.id) {
                    <button class="px-3 py-1 text-xs font-medium rounded-full transition-colors border whitespace-nowrap"
                            [ngClass]="selectedTone === tone.id ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-zinc-800 dark:text-slate-400 dark:border-zinc-700 dark:hover:bg-zinc-700'"
                            (click)="selectedTone = tone.id">
                      {{ tone.icon }} {{ tone.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="flex justify-end pointer-events-none mt-1">
                @if (state === 'Inferencing') {
                  <button class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none pointer-events-auto"
                          (click)="onCancelRewrite()">
                    <i class="bi bi-stop-fill text-lg"></i> Stop
                  </button>
                } @else {
                  <button class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none pointer-events-auto" 
                          (click)="rewrite()"
                          [disabled]="!sourceText.trim() || apiAvailabilityStatus === 'unavailable'">
                    <i class="bi bi-magic text-lg"></i> Rewrite
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Destination -->
          <div class="flex-1 flex flex-col bg-slate-50/30 dark:bg-zinc-900/30 relative">
            <div class="px-5 py-3 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-zinc-900/30 flex justify-between items-center">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i class="bi bi-stars text-amber-500"></i> Polished Result
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            <div class="w-full flex-grow text-slate-800 dark:text-slate-200 text-lg p-5 leading-relaxed overflow-y-auto break-words">
              @if(rewrittenText) {
                {{ rewrittenText }}
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <i class="bi bi-person-lines-fill text-4xl mb-3 text-slate-400"></i>
                  <p class="text-sm text-slate-500">The rewritten text will appear here.</p>
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
