import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-image-description-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row min-h-[450px] overflow-hidden relative">
          
          @if (languageModelAvailability === 'unavailable' || !capabilities.image) {
            <div class="absolute inset-0 z-20 bg-[#ffffff]/80 dark:bg-[#161616]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <i class="bi bi-x-circle text-5xl text-red-500 mb-4"></i>
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Multimodal AI Not Available</h3>
              <p class="text-slate-600 dark:text-slate-400 max-w-md">
                This demo requires an On-Device Language Model with vision capabilities. Please ensure you are using a supported browser with the correct experimental flags enabled.
              </p>
            </div>
          }

          <!-- Image Upload Side -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-700/80 bg-slate-50 dark:bg-[#161616]/50 p-6">
            
            <div class="flex-grow border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors bg-[#ffffff] dark:bg-zinc-800"
                 [ngClass]="{'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20': isDragging}"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)">
                 
              @if (imageUrl) {
                <img [src]="imageUrl" class="absolute inset-0 w-full h-full object-cover z-10" />
                
                <div class="absolute inset-0 bg-black/40 z-10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button class="px-4 py-2 bg-red-500 text-white rounded-lg font-bold shadow-lg border-none" (click)="clearImage()">
                     <i class="bi bi-trash"></i> Remove
                   </button>
                </div>
              } @else {
                <i class="bi bi-image text-5xl text-slate-300 dark:text-zinc-600 mb-4"></i>
                <h4 class="text-slate-700 dark:text-slate-300 font-bold mb-1">Select an Image</h4>
                <p class="text-slate-500 dark:text-slate-500 text-sm mb-4">to generate alt-text</p>
                <button class="px-4 py-2 bg-slate-100 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors"
                        (click)="fileInput.click()">
                  Browse Files
                </button>
                <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
              }
            </div>
            
            <div class="mt-4">
              <input type="text" class="w-full bg-transparent border-b-2 border-slate-300 dark:border-zinc-600 px-2 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                     [(ngModel)]="sourceText"
                     placeholder="Focus instructions (optional)...">
            </div>

            <div class="mt-6 flex flex-col">
              @if (state === 'Inferencing') {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill text-lg"></i> Cancel
                </button>
              } @else {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                        (click)="processImage()"
                        [disabled]="!imageFile || !sourceText.trim()">
                  <i class="bi bi-magic text-lg"></i> Auto-Generate Caption
                </button>
              }
            </div>
          </div>

          <!-- Description Output -->
          <div class="flex-1 flex flex-col bg-[#ffffff] dark:bg-zinc-800/90 relative">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/30 flex justify-between items-center">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-card-text text-indigo-500"></i> Generated Alt-Text
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            <div class="flex-grow p-6 relative flex flex-col">
              @if (extractedText || state === 'Inferencing') {
                <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800/30 flex-grow relative">
                   <p class="text-slate-800 dark:text-indigo-100 text-lg leading-relaxed italic">
                     "{{ extractedText }}"<span *ngIf="state === 'Inferencing'" class="inline-block w-1 h-5 bg-indigo-500 ml-1 animate-pulse align-middle"></span>
                   </p>
                </div>
                @if (state !== 'Inferencing' && extractedText) {
                   <div class="mt-4 flex justify-end">
                     <button class="text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider border-none bg-transparent">
                       <i class="bi bi-copy"></i> Copy to Clipboard
                     </button>
                   </div>
                }
              } @else {
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40 px-8">
                  <i class="bi bi-chat-square-quote text-5xl mb-4 text-slate-400"></i>
                  <p class="text-slate-500 text-sm">Upload an image and hit generate to create a rich, accessible description.</p>
                </div>
              }
            </div>
          </div>

        </div>
      </div>
    </app-demo-layout>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class ImageDescriptionDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'image-description')!;
  
  sourceText = '';
  extractedText = '';
  
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
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    return `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});

const result = await session.prompt([{
  role: "user",
  content: [
    { type: "image", value: myImageFile },
    { type: "text", value: "${escapedPrompt}" }
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

  async processImage() {
    if (!this.imageFile || !this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
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
