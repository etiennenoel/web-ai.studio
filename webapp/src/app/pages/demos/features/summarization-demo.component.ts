import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const Summarizer: any;
declare const LanguageModel: any;

@Component({
  selector: 'app-summarization-demo',
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
                    [ngClass]="apiChoice === 'summarizer' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'summarizer'">
              Summarizer API
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

        <!-- Document Reader Layout -->
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row min-h-[500px] overflow-hidden">
          
          <!-- Article / Document -->
          <div class="flex-[3] flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900">
            <div class="px-5 py-4 border-b border-slate-100 dark:border-zinc-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-file-earmark-text text-indigo-500"></i> Original Document
              </span>
            </div>
            <textarea class="w-full flex-grow bg-transparent border-none outline-none focus:ring-0 text-slate-700 dark:text-slate-300 placeholder-slate-400 resize-none p-6 leading-relaxed font-serif text-lg" 
                      [(ngModel)]="sourceText" 
                      placeholder="Paste a long article or document here..."></textarea>
          </div>

          <!-- Summary Panel -->
          <div class="flex-[2] flex flex-col bg-slate-50/80 dark:bg-zinc-800/50 relative">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-zinc-700/50 flex justify-between items-center bg-slate-100/50 dark:bg-zinc-800">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-lightning-charge text-amber-500"></i> TL;DR Summary
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>

            <!-- Controls & Output -->
            <div class="flex-grow flex flex-col p-6">
              
              @if (apiChoice === 'summarizer') {
                <div class="mb-4">
                  <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Summary Type</label>
                  <select [(ngModel)]="summaryType" class="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="key-points">Key Points</option>
                    <option value="tl;dr">TL;DR</option>
                    <option value="teaser">Teaser</option>
                    <option value="headline">Headline</option>
                  </select>
                </div>
              }

              <div class="flex-grow overflow-y-auto mt-2">
                @if (summaryText) {
                  <div class="prose prose-sm dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm">
                    <app-markdown-renderer [content]="summaryText"></app-markdown-renderer>
                  </div>
                } @else {
                  <div class="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <i class="bi bi-card-text text-4xl mb-3 text-slate-400"></i>
                    <p class="text-sm text-slate-500">Click summarize to generate a condensed version of the document.</p>
                  </div>
                }
              </div>
              
              <div class="mt-6">
                @if (state === 'Inferencing') {
                  <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                          (click)="onCancelSummarization()">
                    <i class="bi bi-stop-fill text-lg"></i> Stop
                  </button>
                } @else {
                  <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                          (click)="summarize()"
                          [disabled]="!sourceText.trim() || apiAvailabilityStatus === 'unavailable'">
                    <i class="bi bi-magic text-lg"></i> Summarize
                  </button>
                }
              </div>
            </div>

          </div>

        </div>
      </div>
    </app-demo-layout>
  `,
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
