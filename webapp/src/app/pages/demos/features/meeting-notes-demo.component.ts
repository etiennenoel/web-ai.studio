import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-meeting-notes-demo',
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
        
        <div class="bg-[#ffffff] dark:bg-[#121212] rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row min-h-[500px] overflow-hidden">
          
          @if (languageModelAvailability === 'unavailable' || !capabilities.audio) {
            <div class="absolute inset-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
              <i class="bi bi-mic-mute text-5xl text-red-500 mb-4"></i>
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Audio AI Not Available</h3>
              <p class="text-slate-600 dark:text-slate-400 max-w-md">
                This demo requires an On-Device Language Model with audio processing capabilities.
              </p>
            </div>
          }

          <!-- Player & Input -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-6">
            
            <div class="mb-6">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Recording</span>
                <span class="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold rounded uppercase">Confidential</span>
              </div>
              <div class="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col gap-4">
                
                @if (audioUrl) {
                  <audio [src]="audioUrl" controls class="w-full"></audio>
                  <button class="text-xs font-medium text-red-500 hover:text-red-700 self-end border-none bg-transparent"
                          (click)="clearAudio()">
                    Remove Audio
                  </button>
                } @else {
                  <button class="w-full py-8 border-2 border-dashed border-slate-300 dark:border-zinc-600 rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
                          (click)="fileInput.click()">
                    <i class="bi bi-file-earmark-music text-3xl mb-2"></i>
                    <span class="text-sm font-medium">Select Meeting Recording</span>
                  </button>
                  <input #fileInput type="file" class="hidden" accept="audio/*" (change)="onFileSelected($event)">
                }
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions</label>
              <textarea class="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
                        [(ngModel)]="sourceText"></textarea>
              
              @if (state === 'Inferencing') {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                        (click)="onCancelGenerate()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop Analysis
                </button>
              } @else {
                <button class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none" 
                        (click)="processAudio()"
                        [disabled]="!audioFile || !sourceText.trim()">
                  <i class="bi bi-magic text-lg"></i> Generate Notes
                </button>
              }
            </div>
          </div>

          <!-- Notes Output -->
          <div class="flex-[1.5] flex flex-col bg-[#ffffff] dark:bg-[#121212] relative">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-[#18181b] flex justify-between items-center">
              <div class="flex flex-col">
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200">Action Items & Summary</span>
                <span class="text-xs text-slate-500">Generated locally</span>
              </div>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            
            <div class="flex-grow p-6 lg:p-8 overflow-y-auto bg-slate-50/50 dark:bg-zinc-900/30">
              @if (extractedText || state === 'Inferencing') {
                <div class="prose prose-indigo dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed max-w-none">
                  <app-markdown-renderer [content]="extractedText"></app-markdown-renderer>
                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-center opacity-30 px-8">
                  <i class="bi bi-journal-check text-6xl mb-4 text-slate-500"></i>
                  <p class="text-slate-600 text-lg">Your meeting summary will appear here.</p>
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
export class MeetingNotesDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'meeting-notes')!;
  
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
  systemPrompt: "You are an executive assistant. Listen to the meeting and extract the top 3 action items.",
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
        systemPrompt: "You are an executive assistant. Listen to the meeting and extract the top 3 action items.",
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
