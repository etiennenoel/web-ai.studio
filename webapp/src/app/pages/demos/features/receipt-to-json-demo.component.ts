import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-receipt-to-json-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-[#1e1e1e] rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row min-h-[550px] overflow-hidden">
          
          @if (languageModelAvailability === 'unavailable' || !capabilities.image) {
            <div class="absolute inset-0 z-20 bg-[#ffffff]/80 dark:bg-[#161616]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <i class="bi bi-x-circle text-5xl text-red-500 mb-4"></i>
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Multimodal AI Not Available</h3>
              <p class="text-slate-600 dark:text-slate-400 max-w-md">
                This demo requires an On-Device Language Model with vision capabilities.
              </p>
            </div>
          }

          <!-- Image Upload Side -->
          <div class="flex-[1.2] flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#161616]/50 p-6">
            
            <div class="flex justify-between items-center mb-4">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-receipt text-indigo-500 text-lg"></i> Receipt Image
              </span>
            </div>

            <div class="flex-grow border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors bg-[#ffffff] dark:bg-zinc-800"
                 [ngClass]="{'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20': isDragging}"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)">
                 
              @if (imageUrl) {
                <img [src]="imageUrl" class="absolute inset-0 w-full h-full object-contain p-2 z-10" />
                <button class="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors border-none"
                        (click)="$event.stopPropagation(); clearImage()">
                  <i class="bi bi-x"></i>
                </button>
              } @else {
                <i class="bi bi-cloud-arrow-up text-5xl text-slate-300 dark:text-zinc-600 mb-4 pointer-events-none"></i>
                <h4 class="text-slate-700 dark:text-slate-300 font-bold mb-1 pointer-events-none">Drag & drop a receipt</h4>
                <p class="text-slate-500 dark:text-slate-500 text-sm mb-4 pointer-events-none">or click to browse</p>
                <button class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg text-sm font-bold shadow-sm transition-colors border-none"
                        (click)="fileInput.click()">
                  Select File
                </button>
                <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
              }
            </div>

            <div class="mt-6 flex flex-col gap-3">
              @if (state === 'Inferencing') {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all active:scale-95 border-none"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop Extraction
                </button>
              } @else {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                        (click)="extractReceipt()"
                        [disabled]="!imageFile">
                  <i class="bi bi-magic text-lg"></i> Extract to JSON
                </button>
              }
            </div>
          </div>

          <!-- JSON Output Side -->
          <div class="flex-[1.5] flex flex-col relative bg-[#1e1e1e]">
            <div class="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-filetype-json text-yellow-500"></i> Parsed Data
              </span>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            
            <div class="flex-grow relative">
              @if (extractedJson || state === 'Inferencing') {
                <app-code-editor [code]="extractedJson" [language]="'json'"></app-code-editor>
              } @else {
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40 px-8">
                  <i class="bi bi-braces text-6xl mb-4 text-zinc-500"></i>
                  <p class="text-zinc-400 text-sm">Structured JSON data will appear here.</p>
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
export class ReceiptToJsonDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'receipt-to-json')!;
  
  extractedJson = '';
  
  isDragging = false;
  imageFile: File | null = null;
  imageUrl: string | null = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    await this.checkAvailability([{ type: "image" }]);
  }

  get dynamicCodeSnippet() {
    return `const schema = ${this.demo.promptRunOptions.structuredOutputJsonSchema};

const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});

const result = await session.prompt([
  { role: "user", content: [
    { type: "text", value: "${this.demo.initialPrompt}" },
    { type: "image", value: receiptImage }
  ]}
], { responseConstraint: schema });

console.log(JSON.parse(result));`;
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

  async extractReceipt() {
    if (!this.imageFile) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedJson = '';
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
      const parsedSchema = JSON.parse(this.demo.promptRunOptions.structuredOutputJsonSchema || '{}');
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "image", value: bmp },
          { type: "text", value: this.demo.initialPrompt }
        ]
      }];
      
      const result = await session.prompt(promptInput, { 
        signal: this.abortController.signal,
        responseConstraint: parsedSchema
      });
      
      firstTokenTime = performance.now();
      this.ttft = Math.round(firstTokenTime - startTime);
      
      try {
        this.extractedJson = JSON.stringify(JSON.parse(result), null, 2);
      } catch (e) {
        this.extractedJson = result;
      }
      
      const endTime = performance.now();
      this.totalTime = Math.round(endTime - startTime);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.extractedJson = '// Error parsing data:\n// ' + e.message;
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
