import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-image-audio-query-demo',
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
        
        <div class="bg-slate-900 rounded-3xl shadow-xl border border-zinc-800 flex flex-col min-h-[550px] overflow-hidden relative">
          
          @if (languageModelAvailability === 'unavailable' || (!capabilities.image || !capabilities.audio)) {
            <div class="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
              <div class="flex gap-4 mb-4">
                <i class="bi bi-camera-video-off text-5xl text-red-500"></i>
                <i class="bi bi-mic-mute text-5xl text-red-500"></i>
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Full Multimodal AI Required</h3>
              <p class="text-zinc-400 max-w-md">
                This demo requires an On-Device Language Model that supports BOTH Vision and Audio processing simultaneously.
              </p>
            </div>
          }

          <!-- Dashboard Header -->
          <div class="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-black/50">
            <span class="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <i class="bi bi-robot text-indigo-500"></i> Multimodal Assistant
            </span>
            <div class="flex gap-2">
              <span class="w-3 h-3 rounded-full" [ngClass]="imageFile ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'"></span>
              <span class="w-3 h-3 rounded-full" [ngClass]="audioFile ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'"></span>
            </div>
          </div>

          <div class="flex flex-col md:flex-row flex-grow">
            <!-- Inputs -->
            <div class="flex-[1.2] flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/30 p-6 gap-6">
              
              <!-- Image Input -->
              <div class="flex-grow flex flex-col">
                <label class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">1. Visual Context</label>
                <div class="flex-grow border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors bg-black/20 hover:bg-zinc-800/50 cursor-pointer"
                     (click)="imageInput.click()">
                  @if (imageUrl) {
                    <img [src]="imageUrl" class="absolute inset-0 w-full h-full object-cover z-10" />
                    <button class="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors border-none"
                            (click)="$event.stopPropagation(); clearImage()">
                      <i class="bi bi-x"></i>
                    </button>
                  } @else {
                    <i class="bi bi-image text-3xl text-zinc-600 mb-2"></i>
                    <span class="text-xs font-medium text-zinc-400">Select Image</span>
                  }
                  <input #imageInput type="file" class="hidden" accept="image/*" (change)="onImageSelected($event)">
                </div>
              </div>

              <!-- Audio Input -->
              <div class="flex-none">
                <label class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">2. Spoken Question</label>
                <div class="border border-zinc-700 rounded-2xl p-4 bg-black/20 flex flex-col gap-3">
                  @if (audioUrl) {
                    <audio [src]="audioUrl" controls class="w-full h-8"></audio>
                    <button class="text-xs text-red-400 hover:text-red-300 font-medium self-end border-none bg-transparent"
                            (click)="clearAudio()">
                      Remove Audio
                    </button>
                  } @else {
                    <button class="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium shadow-sm transition-colors border border-zinc-600 flex justify-center items-center gap-2"
                            (click)="audioInput.click()">
                      <i class="bi bi-mic"></i> Select Audio Question
                    </button>
                    <input #audioInput type="file" class="hidden" accept="audio/*" (change)="onAudioSelected($event)">
                  }
                </div>
              </div>

              <div class="mt-auto pt-2">
                @if (state === 'Inferencing') {
                  <button class="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all active:scale-95 border-none flex justify-center items-center gap-2"
                          (click)="onCancelGenerate()">
                    <div class="w-3 h-3 bg-white rounded-sm"></div> Stop
                  </button>
                } @else {
                  <button class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 border-none flex justify-center items-center gap-2" 
                          (click)="processQuery()"
                          [disabled]="!imageFile || !audioFile">
                    <i class="bi bi-magic"></i> Analyze Both
                  </button>
                }
              </div>

            </div>

            <!-- Assistant Output -->
            <div class="flex-[1.5] flex flex-col relative bg-black/80">
              <div class="flex-grow p-6 lg:p-8 overflow-y-auto flex flex-col">
                
                @if (extractedText || state === 'Inferencing') {
                  <div class="flex gap-4 items-start mb-6">
                    <div class="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 text-zinc-400">
                      <i class="bi bi-person-fill"></i>
                    </div>
                    <div class="flex flex-col gap-2 w-full max-w-[80%]">
                      <div class="bg-zinc-800 text-zinc-300 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                        <span class="italic text-zinc-500">[Audio Question] + [Image Attached]</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex gap-4 items-start flex-row-reverse">
                    <div class="w-10 h-10 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center flex-shrink-0 text-indigo-300">
                      <i class="bi bi-robot"></i>
                    </div>
                    <div class="flex flex-col gap-2 w-full max-w-[80%]">
                      <div class="bg-indigo-600 text-white px-5 py-4 rounded-3xl rounded-tr-sm text-base leading-relaxed shadow-lg">
                        <app-markdown-renderer [content]="extractedText"></app-markdown-renderer>
                        @if (state === 'Inferencing') {
                          <span class="inline-block w-2 h-4 bg-white/70 ml-1 animate-pulse align-middle"></span>
                        }
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="m-auto flex flex-col items-center justify-center text-center opacity-30">
                    <i class="bi bi-layers text-6xl mb-4 text-zinc-500"></i>
                    <p class="text-zinc-400 text-lg">Provide an image and an audio question to begin.</p>
                  </div>
                }

              </div>
            </div>

          </div>
        </div>

      </div>
    </app-demo-layout>
  `,
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
