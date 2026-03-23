import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-write-javascript-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-[#1e1e1e] rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row min-h-[500px] overflow-hidden">
          
          <!-- Requirements Input -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-list-check text-indigo-500"></i> Requirements
              </span>
            </div>
            <textarea class="w-full flex-grow bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none text-lg p-5 pb-24 leading-relaxed font-mono" 
                      [(ngModel)]="sourceText" 
                      placeholder="Describe the function or script you need..."></textarea>
            
            <div class="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-zinc-900/50 dark:via-zinc-900/50 to-transparent pt-10">
              @if (state === 'Inferencing') {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop Generation
                </button>
              } @else {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                        (click)="generateCode()"
                        [disabled]="!sourceText.trim()">
                  <i class="bi bi-code-slash text-lg"></i> Generate JavaScript
                </button>
              }
            </div>
          </div>

          <!-- Code Output -->
          <div class="flex-[1.5] flex flex-col relative bg-[#1e1e1e]">
            <div class="px-5 py-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <div class="flex items-center gap-3">
                <i class="bi bi-filetype-js text-yellow-400 text-xl"></i>
                <span class="text-sm font-medium text-zinc-300 font-mono">output.js</span>
              </div>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            
            <div class="flex-grow overflow-hidden relative">
              @if (generatedCode || state === 'Inferencing') {
                <!-- We use app-code-editor to display the generated code -->
                <app-code-editor [code]="generatedCode" [language]="'javascript'"></app-code-editor>
              } @else {
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                  <i class="bi bi-code-square text-5xl mb-4 text-zinc-500"></i>
                  <p class="text-zinc-400 text-lg">The generated code will appear here.</p>
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
export class WriteJavascriptDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'write-javascript')!;
  
  sourceText = '';
  generatedCode = '';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `const session = await LanguageModel.create({
  systemPrompt: "You are a senior software engineer. Write clean, modern, and efficient JavaScript code to solve the user's request. Output ONLY valid javascript code, without markdown formatting like \`\`\`javascript or \`\`\`."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  // Update editor view
  editor.setValue(editor.getValue() + chunk);
}`;
  }

  async generateCode() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.generatedCode = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: "You are a senior software engineer. Write clean, modern, and efficient JavaScript code to solve the user's request. Output ONLY valid javascript code, without markdown formatting like ```javascript or ```. Do not include explanatory text."
      });
      
      const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        // Basic cleanup if the model still outputs markdown ticks
        let cleanChunk = chunk;
        if (this.generatedCode === '' && chunk.startsWith('```javascript')) {
           cleanChunk = chunk.replace('```javascript\n', '');
        } else if (this.generatedCode === '' && chunk.startsWith('```js')) {
           cleanChunk = chunk.replace('```js\n', '');
        }
        
        this.generatedCode += cleanChunk;
      }
      
      this.generatedCode = this.generatedCode.replace(/```$/g, '');
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.generatedCode = '// Error executing prompt: ' + e.message;
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
