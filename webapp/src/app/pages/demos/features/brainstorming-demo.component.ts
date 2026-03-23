import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-brainstorming-demo',
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
        
        <!-- Prompt Box -->
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5 mb-6">
          <label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block flex items-center gap-2">
            <i class="bi bi-lightbulb-fill text-amber-400"></i> Topic or Problem
          </label>
          <div class="flex gap-3">
            <input type="text" class="flex-grow bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   [(ngModel)]="sourceText"
                   placeholder="E.g., I want to build a new mobile app that helps people learn gardening"
                   (keydown.enter)="generate()">
            
            @if (state === 'Inferencing') {
              <button class="flex items-center justify-center w-12 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95 border-none"
                      (click)="onCancelGenerate()">
                <i class="bi bi-stop-fill text-xl"></i>
              </button>
            } @else {
              <button class="flex items-center justify-center gap-2 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none"
                      (click)="generate()"
                      [disabled]="!sourceText.trim()">
                Generate <i class="bi bi-stars"></i>
              </button>
            }
          </div>
        </div>

        <!-- Sticky Notes Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-h-[300px]">
          @if (ideas.length === 0 && !streamingIdea) {
            <div class="col-span-full h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
              <i class="bi bi-journal-text text-5xl mb-4 text-slate-400"></i>
              <p class="text-slate-500 text-lg">Enter a topic to generate ideas on a board.</p>
            </div>
          }
          
          @for (idea of ideas; track $index) {
            <div class="bg-yellow-50 dark:bg-amber-900/20 rounded-xl p-5 shadow-sm border border-yellow-200 dark:border-amber-700/30 transform transition-transform hover:-translate-y-1 rotate-1 hover:rotate-0">
              <div class="w-6 h-1.5 bg-yellow-200 dark:bg-amber-700/50 mx-auto rounded-full mb-3 shadow-sm"></div>
              <p class="text-slate-800 dark:text-amber-100/90 font-medium leading-relaxed font-serif">{{ idea }}</p>
            </div>
          }
          
          @if (streamingIdea) {
            <div class="bg-yellow-50 dark:bg-amber-900/20 rounded-xl p-5 shadow-sm border border-yellow-200 dark:border-amber-700/30 animate-pulse">
              <div class="w-6 h-1.5 bg-yellow-200 dark:bg-amber-700/50 mx-auto rounded-full mb-3 shadow-sm"></div>
              <p class="text-slate-800 dark:text-amber-100/90 font-medium leading-relaxed font-serif">{{ streamingIdea }}<span class="inline-block w-1.5 h-4 bg-slate-400 ml-1 animate-ping"></span></p>
            </div>
          }
        </div>
        
      </div>
    </app-demo-layout>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class BrainstormingDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'brainstorming')!;
  
  sourceText = '';
  ideas: string[] = [];
  streamingIdea = '';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `const session = await LanguageModel.create({
  systemPrompt: "You are a creative assistant. Generate 5 unique and innovative ideas for the user's prompt. Output each idea separated by '|||'."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  // Parse '|||' to split into cards
  console.log(chunk);
}`;
  }

  async generate() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.ideas = [];
    this.streamingIdea = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: "You are a creative assistant. Generate 5 unique and innovative ideas for the user's prompt. Do NOT use bullet points or numbering. Separate each distinct idea with exactly three pipe characters '|||'. Keep each idea concise."
      });
      
      const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
      
      let fullText = '';
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        fullText += chunk;
        
        const splitIdeas = fullText.split('|||');
        if (splitIdeas.length > 1) {
          this.ideas = splitIdeas.slice(0, -1).map(i => i.trim()).filter(i => i.length > 0);
          this.streamingIdea = splitIdeas[splitIdeas.length - 1];
        } else {
          this.streamingIdea = fullText;
        }
      }
      
      // Final flush
      if (this.streamingIdea.trim()) {
        this.ideas.push(this.streamingIdea.trim());
        this.streamingIdea = '';
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.streamingIdea = 'Error executing prompt: ' + e.message;
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