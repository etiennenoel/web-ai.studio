import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-structured-json-demo',
  templateUrl: './structured-json-demo.component.html',
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
