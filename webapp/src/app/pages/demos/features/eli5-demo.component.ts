import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-eli5-demo',
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
        
        <div class="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-3xl p-8 border border-cyan-100 dark:border-cyan-800/30 shadow-sm min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
          
          <!-- Decorative Background Elements -->
          <div class="absolute top-10 left-10 text-cyan-200 dark:text-cyan-800/40 text-8xl opacity-50 rotate-12 pointer-events-none"><i class="bi bi-question-lg"></i></div>
          <div class="absolute bottom-10 right-10 text-blue-200 dark:text-blue-800/40 text-6xl opacity-50 -rotate-12 pointer-events-none"><i class="bi bi-balloon"></i></div>

          <div class="w-full max-w-2xl relative z-10">
            <h3 class="text-2xl md:text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8 font-serif tracking-tight">
              What do you want to learn about today?
            </h3>
            
            <div class="relative shadow-xl rounded-full">
              <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <i class="bi bi-search text-slate-400 text-xl"></i>
              </div>
              <input type="text" 
                     class="block w-full pl-14 pr-32 py-5 bg-white dark:bg-zinc-900 border-none rounded-full text-lg shadow-inner focus:ring-4 focus:ring-cyan-500/30 text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none transition-all"
                     [(ngModel)]="sourceText"
                     placeholder="e.g., Quantum entanglement"
                     (keydown.enter)="explain()">
              <div class="absolute inset-y-0 right-2 flex items-center">
                @if (state === 'Inferencing') {
                  <button class="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-md transition-transform active:scale-95 border-none"
                          (click)="onCancelExplain()">
                    Stop
                  </button>
                } @else {
                  <button class="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-full font-bold shadow-md transition-transform active:scale-95 border-none disabled:opacity-50"
                          (click)="explain()"
                          [disabled]="!sourceText.trim()">
                    Explain
                  </button>
                }
              </div>
            </div>

            <!-- Answer Card -->
            <div class="mt-8 transition-all duration-500" [ngClass]="explanationText || state === 'Inferencing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none hidden'">
              <div class="bg-white dark:bg-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-zinc-700 relative">
                
                @if (state === 'Inferencing' && !explanationText) {
                  <div class="flex items-center justify-center py-8">
                    <app-latency-loader></app-latency-loader>
                  </div>
                } @else {
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-2xl flex-shrink-0 shadow-sm border border-cyan-200 dark:border-cyan-800/50">
                      <i class="bi bi-lightbulb-fill"></i>
                    </div>
                    <div class="prose prose-lg dark:prose-invert font-serif text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                      <app-markdown-renderer [content]="explanationText"></app-markdown-renderer>
                      @if (state === 'Inferencing') {
                        <span class="inline-block w-2 h-5 bg-cyan-500 ml-1 animate-pulse"></span>
                      }
                    </div>
                  </div>
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
export class Eli5DemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'eli5')!;
  
  sourceText = '';
  explanationText = '';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `const session = await LanguageModel.create({
  systemPrompt: "Explain the following complex concept as if the reader is a 5-year-old child. Use simple words and analogies. Be friendly and encouraging."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  // Append to answer card
  console.log(chunk);
}`;
  }

  async explain() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.explanationText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: "Explain the following complex concept as if the reader is a 5-year-old child. Use simple words, short sentences, and fun analogies. Be friendly and encouraging."
      });
      
      const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.explanationText += chunk;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.explanationText = 'Error generating explanation: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelExplain() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}