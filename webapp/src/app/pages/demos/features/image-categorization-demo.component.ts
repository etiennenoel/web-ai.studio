import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-image-categorization-demo',
  templateUrl: './image-categorization-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ImageCategorizationDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'image-categorization')!;
  
  isDragging = false;
  images: { id: string, file: File, url: string, status: 'pending' | 'processing' | 'done' | 'error', category: string }[] = [];
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    await this.checkAvailability([{ type: "text" }, { type: "image" }]);
  }

  get dynamicCodeSnippet() {
    return `const session = await LanguageModel.create({
  systemPrompt: "Categorize the provided image into ONE of the following tags: Nature, People, Urban, Food, Pets, Document, Object. Return ONLY the single tag word.",
  expectedInputs: [{ type: "image" }]
});

// Process multiple images sequentially or concurrently depending on device
const result = await session.prompt([{
  role: "user",
  content: [
    { type: "image", value: uploadedImageBmp },
    { type: "text", value: "What category?" }
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
      this.handleFiles(Array.from(files));
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // reset
    }
  }

  handleFiles(files: File[]) {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const id = crypto.randomUUID();
        this.images.push({
          id,
          file,
          url: URL.createObjectURL(file),
          status: 'pending',
          category: ''
        });
      }
    }
    
    this.processQueue();
  }

  removeImage(id: string) {
    this.images = this.images.filter(img => img.id !== id);
  }

  async processQueue() {
    if (this.state === PromptInputStateEnum.Inferencing || !this.capabilities.image) return;
    
    const pendingImage = this.images.find(img => img.status === 'pending');
    if (!pendingImage) return;

    this.state = PromptInputStateEnum.Inferencing;
    pendingImage.status = 'processing';
    
    // Performance metrics for the *current* image
    this.ttft = null;
    this.totalTime = null;
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: "Categorize the provided image into exactly ONE of the following exact tags: Nature, People, Urban, Food, Pets, Document, Object. Output nothing but the single chosen tag word.",
        expectedInputs: [{ type: "image" }]
      });
      
      const bmp = await createImageBitmap(pendingImage.file);
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "image", value: bmp },
          { type: "text", value: "Which category does this image belong to? Reply with ONE word." }
        ]
      }];
      
      const stream = session.promptStreaming(promptInput);
      let fullText = '';
      
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        fullText += chunk;
        pendingImage.category = fullText.trim();
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
      
      // Cleanup string in case model was chatty
      const cleanCategory = pendingImage.category.replace(/[^a-zA-Z]/g, '').trim();
      pendingImage.category = cleanCategory || 'Unknown';
      pendingImage.status = 'done';
      
    } catch (e: any) {
      console.error(e);
      pendingImage.status = 'error';
      pendingImage.category = 'Error';
    } finally {
      this.state = PromptInputStateEnum.Ready;
      // Loop
      this.processQueue();
    }
  }
}
