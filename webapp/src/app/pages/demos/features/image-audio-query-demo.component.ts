import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-image-audio-query-demo',
  templateUrl: './image-audio-query-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ImageAudioQueryDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'image-audio-query')!;
  
  extractedText = '';
  
  imageFile: File | null = null;
  imageUrl: string | null = null;
  
  audioFile: File | null = null;
  audioUrl: string | null = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    await this.checkAvailability([{ type: "image" }, { type: "audio" }]);
  }

  get dynamicCodeSnippet() {
    return `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }, { type: "audio" }]
});

const result = await session.prompt([{
  role: "user",
  content: [
    { type: "image", value: myImageFile },
    { type: "audio", value: myQuestionAudioFile }
  ]
}]);
console.log(result);`;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('image/')) {
        this.imageFile = file;
        this.imageUrl = URL.createObjectURL(file);
      }
    }
  }

  onAudioSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('audio/')) {
        this.audioFile = file;
        this.audioUrl = URL.createObjectURL(file);
      }
    }
  }

  clearImage() {
    this.imageFile = null;
    this.imageUrl = null;
  }

  clearAudio() {
    this.audioFile = null;
    this.audioUrl = null;
  }

  async processQuery() {
    if (!this.imageFile || !this.audioFile) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        expectedInputs: [{ type: "image" }, { type: "audio" }]
      });
      
      const bmp = await createImageBitmap(this.imageFile);
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "image", value: bmp },
          { type: "audio", value: this.audioFile }
        ]
      }];
      
      const stream = session.promptStreaming(promptInput, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.extractedText += chunk;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.extractedText = 'Error executing prompt: ' + e.message;
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
