import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-write-html-css-demo',
  templateUrl: './write-html-css-demo.component.html',
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