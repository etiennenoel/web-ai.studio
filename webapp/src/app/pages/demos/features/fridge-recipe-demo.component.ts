import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-fridge-recipe-demo',
  templateUrl: './fridge-recipe-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class FridgeRecipeDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'fridge-recipe')!;
  
  sourceText = '';
  recipeText = '';
  
  isDragging = false;
  imageFile: File | null = null;
  imageUrl: string | null = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability([{ type: "text" }, { type: "image" }]);
  }

  get dynamicCodeSnippet() {
    return `const session = await LanguageModel.create({
  systemPrompt: "You are a master chef. Look at the ingredients in the image and suggest a creative recipe. Format as a recipe card with 'Ingredients Found' and 'Instructions'.",
  expectedInputs: [{ type: "image" }]
});

const result = await session.prompt([{
  role: "user",
  content: [
    { type: "image", value: fridgeImageFile },
    { type: "text", value: "${this.sourceText}" }
  ]
}]);
console.log(result);`;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type.startsWith('image/')) {
      this.imageFile = file;
      this.imageUrl = URL.createObjectURL(file);
    }
  }

  clearImage() {
    this.imageFile = null;
    this.imageUrl = null;
  }

  async generateRecipe() {
    if (!this.imageFile) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.recipeText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: "You are a master chef. Look at the ingredients in the image and suggest a creative recipe. Format as a recipe card with 'Ingredients Found' and 'Instructions'.",
        expectedInputs: [{ type: "image" }]
      });
      
      const bmp = await createImageBitmap(this.imageFile);
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "image", value: bmp },
          { type: "text", value: this.sourceText }
        ]
      }];
      
      const stream = session.promptStreaming(promptInput, { signal: this.abortController.signal });
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.recipeText += chunk;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.recipeText = 'Error executing prompt: ' + e.message;
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
