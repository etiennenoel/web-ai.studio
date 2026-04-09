import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-brainstorming-demo',
  templateUrl: './brainstorming-demo.component.html',
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