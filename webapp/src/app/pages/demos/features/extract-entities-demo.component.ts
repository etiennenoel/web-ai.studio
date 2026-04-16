import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-extract-entities-demo',
  templateUrl: './extract-entities-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ExtractEntitiesDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'extract-entities')!;
  
  sourceText = '';
  schemaText = '';
  extractedData: any = null;
  rawJson = '';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    this.schemaText = this.demo.promptRunOptions.structuredOutputJsonSchema || '{}';
    await this.checkAvailability();
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `const schema = {
  type: "object",
  properties: {
    people: { type: "array", items: { type: "string" } },
    locations: { type: "array", items: { type: "string" } }
  }
};

const session = await LanguageModel.create();
const result = await session.prompt("${escapedPrompt}", {
  responseConstraint: schema
});
const data = JSON.parse(result);
console.log(data.people, data.locations);`;
  }

  async extractEntities() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedData = null;
    this.rawJson = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create();
      
      const parsedSchema = JSON.parse(this.schemaText);
      
      const result = await session.prompt(this.sourceText, { 
        signal: this.abortController.signal,
        responseConstraint: parsedSchema
      });
      
      firstTokenTime = performance.now();
      this.ttft = Math.round(firstTokenTime - startTime);
      
      try {
        this.extractedData = JSON.parse(result);
        this.rawJson = JSON.stringify(this.extractedData, null, 2);
      } catch (e) {
        this.rawJson = result;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.rawJson = '// Error parsing data:\n// ' + e.message;
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
