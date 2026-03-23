import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-audio-summarization-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 lg:p-8">
          
          @if (languageModelAvailability === 'unavailable' || !capabilities.audio) {
            <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <i class="bi bi-exclamation-triangle-fill text-red-500 mt-0.5"></i>
              <div>
                <h4 class="font-bold text-red-800 dark:text-red-400 text-sm">Audio API Unavailable</h4>
                <p class="text-sm text-red-700 dark:text-red-300">This demo requires an On-Device Language Model with audio processing capabilities enabled in your browser.</p>
              </div>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <!-- Input Column -->
            <div class="flex flex-col gap-6">
              
              <!-- Audio Dropzone -->
              <div>
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Upload Lecture or Podcast</label>
                <div class="border-2 border-dashed border-slate-300 dark:border-zinc-600 rounded-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer"
                     (click)="fileInput.click()">
                  @if (audioUrl) {
                    <div class="flex flex-col items-center w-full z-10">
                      <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xl mb-3 shadow-sm">
                        <i class="bi bi-file-music-fill"></i>
                      </div>
                      <span class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 truncate max-w-[200px]">{{ audioFile?.name }}</span>
                      <audio [src]="audioUrl" controls class="w-full h-10 max-w-[250px]" (click)="$event.stopPropagation()"></audio>
                      <button class="mt-3 text-xs text-red-500 hover:text-red-700 font-medium z-20 relative"
                              (click)="$event.stopPropagation(); clearAudio()">
                        Remove file
                      </button>
                    </div>
                  } @else {
                    <i class="bi bi-cloud-arrow-up text-4xl text-indigo-400 dark:text-indigo-500 mb-3"></i>
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-300">Click to browse</span>
                    <span class="text-xs text-slate-500 mt-1">MP3, WAV, M4A</span>
                  }
                  <input #fileInput type="file" class="hidden" accept="audio/*" (change)="onFileSelected($event)">
                </div>
              </div>

              <!-- Options -->
              <div>
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Summary Instructions</label>
                <textarea class="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20"
                          [(ngModel)]="sourceText"
                          placeholder="e.g. Provide a 2-sentence summary of the main points"></textarea>
              </div>

              <!-- Action -->
              <div>
                @if (state === 'Inferencing') {
                  <button class="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all active:scale-95 border-none flex items-center justify-center gap-2"
                          (click)="onCancelGenerate()">
                    <div class="w-3 h-3 bg-white rounded-sm"></div> Stop Summarizing
                  </button>
                } @else {
                  <button class="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 border-none flex items-center justify-center gap-2" 
                          (click)="processAudio()"
                          [disabled]="!audioFile || !sourceText.trim()">
                    <i class="bi bi-magic"></i> Generate Summary
                  </button>
                }
              </div>
            </div>

            <!-- Output Column -->
            <div class="flex flex-col bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden min-h-[300px]">
              <div class="px-5 py-3 border-b border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex justify-between items-center">
                <span class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <i class="bi bi-card-text text-indigo-500"></i> AI Summary
                </span>
                @if (state === 'Inferencing') {
                  <app-latency-loader></app-latency-loader>
                }
              </div>
              <div class="p-6 flex-grow overflow-y-auto">
                @if (extractedText || state === 'Inferencing') {
                  <div class="prose prose-indigo dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed max-w-none">
                    <app-markdown-renderer [content]="extractedText"></app-markdown-renderer>
                  </div>
                } @else {
                  <div class="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <i class="bi bi-headphones text-5xl mb-4 text-slate-400"></i>
                    <p class="text-slate-600 text-sm max-w-[200px]">Upload an audio file and hit generate to see the summary here.</p>
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
export class AudioSummarizationDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'audio-summarization')!;
  
  sourceText = '';
  extractedText = '';
  
  audioFile: File | null = null;
  audioUrl: string | null = null;
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkAvailability([{ type: "text" }, { type: "audio" }]);
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `const session = await LanguageModel.create({
  systemPrompt: "${escapedPrompt}",
  expectedInputs: [{ type: "audio", languages: ["en"] }]
});

const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "Summarize this audio clip." },
    { type: "audio", value: audioFile }
  ]
}]);
console.log(result);`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('audio/')) {
        this.audioFile = file;
        this.audioUrl = URL.createObjectURL(file);
      }
    }
  }

  clearAudio() {
    this.audioFile = null;
    this.audioUrl = null;
  }

  async processAudio() {
    if (!this.audioFile) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.extractedText = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      const session = await LanguageModel.create({
        systemPrompt: this.sourceText,
        expectedInputs: [{ type: "audio", languages: ["en"] }]
      });
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "text", value: "Please summarize this audio clip according to the system instructions." },
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
        this.extractedText = 'Error generating summary: ' + e.message;
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
