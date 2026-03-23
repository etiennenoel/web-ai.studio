import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-sql-generator-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <i class="bi bi-database-check text-indigo-500"></i> Natural Language to SQL
            </label>
            <div class="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-[#161616] px-3 py-1 rounded-lg">
              Table: users (id, name, age, city)
            </div>
          </div>
          
          <div class="flex flex-col md:flex-row gap-4">
            <input type="text" class="flex-grow bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                   [(ngModel)]="sourceText"
                   placeholder="E.g., Find the average age of users living in New York"
                   (keydown.enter)="generateSql()">
            
            @if (state === 'Inferencing') {
              <button class="flex items-center justify-center px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                      (click)="onCancelGenerate()">
                <i class="bi bi-stop-fill text-lg"></i> Stop
              </button>
            } @else {
              <button class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none"
                      (click)="generateSql()"
                      [disabled]="!sourceText.trim()">
                <i class="bi bi-lightning-charge"></i> Generate SQL
              </button>
            }
          </div>
        </div>

        <div class="bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-xl border border-zinc-800 min-h-[200px] flex flex-col relative">
          <div class="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
            <span class="text-xs font-medium text-zinc-400 font-mono flex items-center gap-2"><i class="bi bi-terminal"></i> query.sql</span>
            @if (state === 'Inferencing') {
              <app-latency-loader></app-latency-loader>
            }
          </div>
          <div class="flex-grow relative">
            @if (generatedSql || state === 'Inferencing') {
              <app-code-editor [code]="generatedSql" [language]="'sql'"></app-code-editor>
            } @else {
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50 p-6">
                <i class="bi bi-database text-4xl mb-3 text-zinc-500"></i>
                <p class="text-zinc-400 text-sm">Generated SQL will appear here.</p>
              </div>
            }
          </div>
        </div>

      </div>
    </app-demo-layout>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class SqlGeneratorDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'sql-generator')!;
  
  sourceText = '';
  generatedSql = '';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `const session = await LanguageModel.create({
  systemPrompt: "You are an expert database administrator. Generate a valid SQL query based on the user's request. Table: users(id, name, age, city). Only output the SQL query without any markdown formatting."
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  // Append to SQL editor
  editor.setValue(editor.getValue() + chunk);
}`;
  }

  async generateSql() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.generatedSql = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: "You are an expert database administrator. Generate a valid SQL query based on the user's request. Table: users(id, name, age, city). Only output the SQL query without any markdown formatting like ```sql or ```. Do not include explanations."
      });
      
      const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        
        let cleanChunk = chunk;
        if (this.generatedSql === '' && chunk.startsWith('```sql')) {
           cleanChunk = chunk.replace('```sql\n', '');
        } else if (this.generatedSql === '' && chunk.startsWith('```')) {
           cleanChunk = chunk.replace('```\n', '');
        }
        
        this.generatedSql += cleanChunk;
      }
      
      this.generatedSql = this.generatedSql.replace(/```$/g, '').trim();
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.generatedSql = '-- Error generating SQL: ' + e.message;
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
