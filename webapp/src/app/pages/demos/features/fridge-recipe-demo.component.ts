import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-fridge-recipe-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col lg:flex-row min-h-[500px] overflow-hidden relative">
          
          @if (languageModelAvailability === 'unavailable' || !capabilities.image) {
            <div class="absolute inset-0 z-20 bg-[#ffffff]/80 dark:bg-[#161616]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <i class="bi bi-x-circle text-5xl text-red-500 mb-4"></i>
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Multimodal AI Not Available</h3>
              <p class="text-slate-600 dark:text-slate-400 max-w-md">
                This demo requires an On-Device Language Model with vision capabilities.
              </p>
            </div>
          }

          <!-- Fridge Image Upload -->
          <div class="flex-1 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-zinc-700/80 bg-orange-50/50 dark:bg-orange-900/10 p-6 lg:p-8">
            
            <div class="flex-grow border-2 border-dashed border-orange-300 dark:border-orange-800/50 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-colors bg-[#ffffff] dark:bg-[#161616]/50"
                 [ngClass]="{'border-orange-500 bg-orange-100/50 dark:bg-orange-900/30': isDragging}"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)">
                 
              @if (imageUrl) {
                <img [src]="imageUrl" class="absolute inset-0 w-full h-full object-cover z-10" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10 opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                   <button class="self-end w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white shadow-lg border-none" (click)="clearImage()">
                     <i class="bi bi-trash"></i>
                   </button>
                </div>
              } @else {
                <div class="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center text-4xl mb-4 shadow-sm">
                  <i class="bi bi-egg-fried"></i>
                </div>
                <h4 class="text-slate-800 dark:text-slate-200 font-bold mb-2 text-lg">Snap your fridge</h4>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center max-w-[200px]">Upload a photo of your ingredients to generate a recipe.</p>
                <button class="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md transition-colors border-none"
                        (click)="fileInput.click()">
                  <i class="bi bi-camera mr-2"></i> Select Photo
                </button>
                <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
              }
            </div>

            <div class="mt-6 flex flex-col">
              @if (state === 'Inferencing') {
                <button class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all active:scale-95 border-none text-lg"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill"></i> Cancel
                </button>
              } @else {
                <button class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 border-none text-lg" 
                        (click)="generateRecipe()"
                        [disabled]="!imageFile">
                  <i class="bi bi-magic"></i> Chef, what's for dinner?
                </button>
              }
            </div>
          </div>

          <!-- Recipe Output -->
          <div class="flex-1 flex flex-col bg-[#ffffff] dark:bg-zinc-800/90 relative">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/30 flex justify-between items-center">
              <span class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-journal-text text-orange-500"></i> Recipe Card
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            
            <div class="flex-grow overflow-y-auto p-6 lg:p-8 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] dark:bg-none">
              @if (recipeText || state === 'Inferencing') {
                <div class="prose prose-orange dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed font-serif max-w-none">
                  <app-markdown-renderer [content]="recipeText"></app-markdown-renderer>
                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-center opacity-30 px-8">
                  <i class="bi bi-book text-6xl mb-6 text-slate-500"></i>
                  <p class="text-slate-600 text-lg font-serif italic">"Awaiting your ingredients..."</p>
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
