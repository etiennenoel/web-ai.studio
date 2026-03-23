import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-image-categorization-demo',
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
        
        <div class="bg-slate-100 dark:bg-[#121212] rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 p-6 min-h-[500px]">
          
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200">Local Photo Library</h3>
            <button class="px-4 py-2 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl shadow-sm transition-colors border border-slate-200 dark:border-zinc-700"
                    (click)="fileInput.click()">
              <i class="bi bi-plus-lg mr-1"></i> Add Photo
            </button>
            <input #fileInput type="file" class="hidden" accept="image/*" multiple (change)="onFilesSelected($event)">
          </div>

          @if (images.length === 0) {
            <div class="h-[300px] border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors"
                 [ngClass]="{'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20': isDragging}"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)">
              <i class="bi bi-images text-5xl text-slate-300 dark:text-zinc-600 mb-4"></i>
              <p class="text-slate-500 dark:text-slate-400 font-medium mb-2">Drag and drop photos here to categorize them</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">Processing happens entirely on your device.</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              @for (img of images; track img.id) {
                <div class="relative group bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-zinc-700 aspect-square">
                  <img [src]="img.url" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  
                  <!-- Overlay gradient for text readability -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
                  
                  <div class="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
                    @if (img.status === 'processing') {
                      <div class="px-2 py-1 bg-white/20 backdrop-blur-md rounded-md flex items-center gap-2">
                        <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span class="text-xs font-medium text-white shadow-sm">Scanning...</span>
                      </div>
                    } @else if (img.status === 'done') {
                      <span class="px-2.5 py-1 bg-white/90 dark:bg-black/70 backdrop-blur-md text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                        {{ img.category }}
                      </span>
                    } @else {
                      <span class="text-xs text-red-400 font-medium bg-black/50 px-2 py-1 rounded">Failed</span>
                    }
                    
                    <button class="w-8 h-8 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                            (click)="removeImage(img.id)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </app-demo-layout>
  `,
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
