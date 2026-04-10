import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-sql-generator-demo',
  templateUrl: './sql-generator-demo.component.html',
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
