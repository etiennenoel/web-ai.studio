import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-audio-transcription-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row min-h-[400px] overflow-hidden relative">
          
          @if (languageModelAvailability === 'unavailable' || !capabilities.audio) {
            <div class="absolute inset-0 z-20 bg-[#ffffff]/80 dark:bg-[#161616]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <i class="bi bi-mic-mute text-5xl text-red-500 mb-4"></i>
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Audio AI Not Available</h3>
              <p class="text-slate-600 dark:text-slate-400 max-w-md">
                This demo requires an On-Device Language Model with audio processing capabilities.
              </p>
            </div>
          }

          <!-- Audio Input Side -->
          <div class="flex-[1] flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-700/80 bg-slate-50 dark:bg-[#161616]/50 p-6 lg:p-8 justify-center items-center">
            
            <!-- Voice Memo App Mockup -->
            <div class="w-full max-w-xs bg-[#ffffff] dark:bg-black rounded-3xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
              <div class="bg-slate-100 dark:bg-[#161616] px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                <span class="text-xs font-bold text-slate-500 dark:text-zinc-500 tracking-wider">VOICE MEMOS</span>
                <i class="bi bi-mic text-red-500"></i>
              </div>
              
              <div class="p-6 flex flex-col items-center justify-center min-h-[200px]">
                
                @if (audioUrl) {
                  <audio [src]="audioUrl" controls class="w-full mb-6"></audio>
                  <button class="px-4 py-2 bg-slate-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-900/30 text-slate-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-zinc-700 w-full"
                          (click)="clearAudio()">
                    Remove Audio
                  </button>
                } @else {
                  <div class="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center text-4xl mb-4">
                    <i class="bi bi-soundwave"></i>
                  </div>
                  <h4 class="text-slate-800 dark:text-slate-200 font-bold mb-2">No Audio Selected</h4>
                  
                  <button class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-[#ffffff] dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-full text-sm font-bold shadow-md transition-colors border-none w-full"
                          (click)="fileInput.click()">
                    Upload File
                  </button>
                  <input #fileInput type="file" class="hidden" accept="audio/*" (change)="onFileSelected($event)">
                }
                
              </div>
              
              <div class="p-4 bg-slate-50 dark:bg-[#161616] border-t border-slate-200 dark:border-zinc-800">
                @if (state === 'Inferencing') {
                  <button class="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-sm transition-all active:scale-95 border-none flex items-center justify-center gap-2"
                          (click)="onCancelGenerate()">
                    <div class="w-3 h-3 bg-[#ffffff] rounded-sm"></div> Stop
                  </button>
                } @else {
                  <button class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 border-none flex items-center justify-center gap-2" 
                          (click)="processAudio()"
                          [disabled]="!audioFile">
                    <i class="bi bi-text-paragraph"></i> Transcribe
                  </button>
                }
              </div>
            </div>

          </div>

          <!-- Transcript Output -->
          <div class="flex-[1.5] flex flex-col bg-[#ffffff] dark:bg-zinc-800/90 relative">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/30 flex justify-between items-center">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-card-text text-blue-500"></i> Transcript
              </span>
              @if (state === 'Inferencing') {
                <div class="flex items-center gap-2 text-xs font-medium text-blue-500">
                  Listening <span class="flex gap-0.5"><span class="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span><span class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></span><span class="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span></span>
                </div>
              }
            </div>
            <div class="flex-grow p-6 lg:p-8 overflow-y-auto">
              @if (extractedText || state === 'Inferencing') {
                <div class="prose prose-lg dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {{ extractedText }}
                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-center opacity-30 px-8">
                  <i class="bi bi-chat-left-dots text-6xl mb-4 text-slate-500"></i>
                  <p class="text-slate-600 text-lg">Your transcription will appear here.</p>
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
export class AudioTranscriptionDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'audio-transcription')!;
  
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
    return `const session = await LanguageModel.create({
  expectedInputs: [{ type: "audio", languages: ["en"] }]
});

const result = await session.prompt([{
  role: "user",
  content: [
    { type: "text", value: "${this.sourceText}" },
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
        expectedInputs: [{ type: "audio", languages: ["en"] }]
      });
      
      const promptInput = [{
        role: "user",
        content: [
          { type: "text", value: this.sourceText },
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
        this.extractedText = 'Error transcribing audio: ' + e.message;
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
