import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-structured-json-demo',
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
          
          <!-- Input Side -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#161616]/50">
            
            <div class="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#161616] flex justify-between items-center">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data Pipeline Source</span>
            </div>

            <!-- Schema Editor (Readonly for demo simplicity, or editable) -->
            <div class="p-4 border-b border-slate-200 dark:border-zinc-800">
              <label class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                <i class="bi bi-braces text-blue-500"></i> Target JSON Schema
              </label>
              <div class="bg-[#1e1e1e] rounded-xl overflow-hidden border border-zinc-700 h-40 text-xs">
                <app-code-editor [code]="schemaText" [language]="'json'"></app-code-editor>
              </div>
            </div>

            <div class="flex-grow flex flex-col p-4">
               <label class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                <i class="bi bi-file-text text-amber-500"></i> Unstructured Text
              </label>
              <textarea class="w-full flex-grow bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none text-sm p-4 leading-relaxed font-sans shadow-sm" 
                        [(ngModel)]="sourceText" 
                        placeholder="Paste unstructured data here..."></textarea>
            </div>
            
            <div class="p-4 pt-0">
              @if (state === 'Inferencing') {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop Parsing
                </button>
              } @else {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                        (click)="parseJson()"
                        [disabled]="!sourceText.trim()">
                  <i class="bi bi-braces-asterisk text-lg"></i> Extract Structured Data
                </button>
              }
            </div>
          </div>

          <!-- JSON Output Side -->
          <div class="flex-1 flex flex-col relative bg-[#1e1e1e]">
            <div class="px-5 py-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-filetype-json text-yellow-500"></i> Parsed Output
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            
            <div class="flex-grow relative">
              @if (extractedJson || state === 'Inferencing') {
                <app-code-editor [code]="extractedJson" [language]="'json'"></app-code-editor>
              } @else {
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40 px-8">
                  <i class="bi bi-braces text-6xl mb-4 text-zinc-500"></i>
                  <p class="text-zinc-400 text-sm">Valid, strictly typed JSON will appear here.</p>
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
export class StructuredJsonDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'structured-json')!;
  
  sourceText = '';
  schemaText = '';
  extractedJson = '';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    this.schemaText = this.demo.promptRunOptions.structuredOutputJsonSchema || '{}';
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `const schema = ${this.schemaText};

const session = await LanguageModel.create();
const result = await session.prompt("${escapedPrompt}", {
  responseConstraint: schema
});
console.log(JSON.parse(result));`;
  }

  async parseJson() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedJson = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create();
      
      const parsedSchema = JSON.parse(this.schemaText);
      
      // prompt with responseConstraint doesn't stream nicely in all implementations if it expects a single JSON object.
      // We will just await the full prompt.
      const result = await session.prompt(this.sourceText, { 
        signal: this.abortController.signal,
        responseConstraint: parsedSchema
      });
      
      firstTokenTime = performance.now();
      this.ttft = Math.round(firstTokenTime - startTime);
      
      // Format it nicely
      try {
        this.extractedJson = JSON.stringify(JSON.parse(result), null, 2);
      } catch (e) {
        this.extractedJson = result; // fallback if it's somehow not parsable despite constraints
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.extractedJson = '// Error parsing data:\n// ' + e.message;
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
