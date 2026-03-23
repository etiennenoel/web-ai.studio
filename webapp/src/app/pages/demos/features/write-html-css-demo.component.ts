import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-write-html-css-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-[#1e1e1e] rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col min-h-[600px] overflow-hidden">
          
          <!-- Top Bar: Input -->
          <div class="flex flex-col relative border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 lg:p-5">
            <div class="flex items-center bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all shadow-sm">
              <i class="bi bi-magic text-indigo-500 text-xl mr-3"></i>
              <input type="text" class="flex-grow bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-lg font-mono py-2" 
                     [(ngModel)]="sourceText" 
                     [placeholder]="activeSession ? 'E.g., Make the background blue, add a shadow...' : 'E.g., Create a responsive pricing card component'"
                     (keydown.enter)="generateCode()">
              
              @if (state === 'Inferencing') {
                <button class="ml-3 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop
                </button>
              } @else {
                <button class="ml-3 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                        (click)="generateCode()"
                        [disabled]="!sourceText.trim()">
                  {{ activeSession ? 'Update' : 'Generate' }}
                </button>
              }
            </div>
            @if (state === 'Inferencing') {
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-zinc-800">
                <div class="h-1 bg-indigo-500 animate-pulse"></div>
              </div>
            }
          </div>

          <!-- Content Split: Code & Preview -->
          <div class="flex flex-col md:flex-row flex-grow">
            <!-- Code Area -->
            <div class="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-[#1e1e1e] relative min-h-[300px]">
              <div class="px-4 py-2 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <i class="bi bi-filetype-html text-orange-400"></i>
                  <span class="text-xs font-medium text-zinc-300 font-mono">index.html</span>
                </div>
                @if (activeSession) {
                  <button class="text-xs text-red-400 hover:text-red-300 font-medium transition-colors bg-transparent border-none cursor-pointer"
                          (click)="resetSession()">
                    Reset <i class="bi bi-arrow-clockwise ml-1"></i>
                  </button>
                }
              </div>
              <div class="flex-grow overflow-hidden relative">
                @if (generatedCode || state === 'Inferencing') {
                  <app-code-editor [code]="generatedCode" [language]="'html'"></app-code-editor>
                } @else {
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50 p-6">
                    <i class="bi bi-code text-4xl mb-3 text-zinc-500"></i>
                    <p class="text-zinc-400 text-sm">HTML code will be generated here.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Live Preview -->
            <div class="flex-1 flex flex-col bg-slate-50 dark:bg-zinc-900 relative min-h-[300px]">
              <div class="px-4 py-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <i class="bi bi-browser-chrome text-blue-500"></i>
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-400 font-mono">Live Preview</span>
                </div>
              </div>
              <div class="flex-grow overflow-y-auto p-4 bg-white relative">
                @if (generatedCode) {
                  <!-- Safe usage of innerHTML for a local browser demo. We use Tailwind via a CDN link in the system prompt. -->
                  <div [innerHTML]="generatedCode | safeHtml"></div>
                } @else {
                  <div class="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <i class="bi bi-eye text-4xl mb-3 text-slate-500"></i>
                    <p class="text-slate-500 text-sm">Preview will render automatically.</p>
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
export class WriteHtmlCssDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'write-html-css')!;
  
  sourceText = '';
  generatedCode = '';
  
  activeSession: any = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    if (this.activeSession) {
      return `// Using existing session to update the UI iteratively
const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  // Update editor and preview DOM with the NEW code block
  editor.setValue(editor.getValue() + chunk);
  previewDiv.innerHTML = editor.getValue();
}`;
    }
    
    return `const session = await LanguageModel.create({
  systemPrompt: "You are an expert frontend developer. Generate a clean HTML snippet styled entirely with Tailwind CSS utility classes based on the user's prompt. Do NOT include <head>, <body>, or markdown ticks. Return ONLY the raw HTML."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  // Update editor and preview DOM
  editor.setValue(editor.getValue() + chunk);
  previewDiv.innerHTML = editor.getValue();
}`;
  }
  
  resetSession() {
    if (this.activeSession) {
      this.activeSession.destroy();
      this.activeSession = null;
    }
    this.generatedCode = '';
    this.sourceText = this.demo.initialPrompt;
    this.ttft = null;
    this.totalTime = null;
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.activeSession) {
      this.activeSession.destroy();
    }
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
      if (!this.activeSession) {
        this.activeSession = await LanguageModel.create({
          systemPrompt: "You are an expert frontend developer. Generate a clean HTML snippet styled entirely with Tailwind CSS utility classes based on the user's prompt. Assume Tailwind CSS is already loaded. Do NOT output a full HTML document (no <head>, no <body>). Do NOT wrap the code in markdown formatting like ```html. Return ONLY the raw HTML block. Every time the user asks for a change, output the FULL new HTML block."
        });
      }
      
      const stream = this.activeSession.promptStreaming(this.sourceText, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        
        let cleanChunk = chunk;
        if (this.generatedCode === '' && chunk.startsWith('```html')) {
           cleanChunk = chunk.replace('```html\n', '');
        } else if (this.generatedCode === '' && chunk.startsWith('```')) {
           cleanChunk = chunk.replace('```\n', '');
        }
        
        this.generatedCode += cleanChunk;
      }
      
      this.generatedCode = this.generatedCode.replace(/```$/g, '');
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
      this.sourceText = ''; // Clear input for follow-up prompts
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.generatedCode = '<!-- Error executing prompt: ' + e.message + ' -->';
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