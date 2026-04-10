import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-write-javascript-demo',
  templateUrl: './write-javascript-demo.component.html',
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
