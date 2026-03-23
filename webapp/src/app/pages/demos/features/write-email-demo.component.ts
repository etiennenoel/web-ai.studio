import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const Writer: any;
declare const LanguageModel: any;

const systemPrompt = `You are an intelligent email writer. You are tasked to write ONLY the email body. Draft a polite and professional email based on the user's prompt. Do not include subject lines, just the body. Include only the email body. `;

@Component({
  selector: 'app-write-email-demo',
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
        
        <div class="mb-4 flex items-center justify-between">
          <div class="inline-flex bg-slate-200/50 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button class="px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none outline-none focus:outline-none"
                    [ngClass]="apiChoice === 'writer' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'writer'">
              Writer API
            </button>
            <button class="px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none outline-none focus:outline-none"
                    [ngClass]="apiChoice === 'prompt' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'prompt'">
              Prompt API
            </button>
          </div>
          
          <div class="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
            Status: 
            @if (apiAvailabilityStatus === 'available') {
              <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="bi bi-check-circle-fill"></i> Available</span>
            } @else if (apiAvailabilityStatus === 'unavailable') {
              <span class="text-red-600 dark:text-red-400 flex items-center gap-1"><i class="bi bi-x-circle-fill"></i> Unavailable</span>
            } @else {
              <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1"><i class="bi bi-arrow-down-circle-fill"></i> Download Required</span>
            }
          </div>
        </div>

        <!-- Mock Email Client -->
        <div class="bg-[#ffffff] dark:bg-[#161616] rounded-xl shadow-lg border border-slate-200 dark:border-zinc-700 overflow-hidden flex flex-col">
          
          <!-- Email Header -->
          <div class="bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 p-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-400"></div>
              <div class="w-3 h-3 rounded-full bg-amber-400"></div>
              <div class="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>
            <div class="text-sm font-semibold text-slate-600 dark:text-slate-400">New Message</div>
            <div></div>
          </div>
          
          <!-- Email Fields -->
          <div class="flex flex-col border-b border-slate-200 dark:border-zinc-700">
            <div class="flex items-center px-4 py-2 border-b border-slate-100 dark:border-zinc-800/50">
              <span class="text-slate-400 w-16 text-sm">To:</span>
              <input type="text" class="flex-grow bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm" value="john.doe@example.com">
            </div>
            <div class="flex items-center px-4 py-2 border-b border-slate-100 dark:border-zinc-800/50">
              <span class="text-slate-400 w-16 text-sm">Subject:</span>
              <input type="text" class="flex-grow bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-sm font-semibold" value="Meeting request">
            </div>
          </div>

          <!-- Magic Compose Box -->
          <div class="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3">
            <i class="bi bi-stars text-indigo-500 text-xl flex-shrink-0"></i>
            <input type="text" 
                   class="flex-grow bg-[#ffffff] dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800/50 rounded-full px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                   [(ngModel)]="sourceText"
                   placeholder="What should this email be about?"
                   (keydown.enter)="draftEmail()">
            
            @if (state === 'Inferencing') {
              <button class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold shadow-md transition-transform active:scale-95 border-none flex-shrink-0"
                      (click)="onCancelDraft()">
                Stop
              </button>
            } @else {
              <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold shadow-md transition-transform active:scale-95 border-none flex-shrink-0 disabled:opacity-50"
                      (click)="draftEmail()"
                      [disabled]="!sourceText.trim() || apiAvailabilityStatus === 'unavailable'">
                Draft
              </button>
            }
          </div>

          <!-- Email Body -->
          <div class="flex-grow relative min-h-[300px]">
            <div class="absolute inset-0 p-6 overflow-y-auto">
              @if (emailBody || state === 'Inferencing') {
                <div class="prose prose-sm dark:prose-invert text-slate-800 dark:text-slate-200 max-w-none">
                  <app-markdown-renderer [content]="emailBody"></app-markdown-renderer>
                </div>
              } @else {
                <div class="text-slate-400 dark:text-slate-600 font-sans">Email body will appear here...</div>
              }
            </div>
            @if (state === 'Inferencing') {
              <div class="absolute bottom-4 right-4">
                <app-latency-loader></app-latency-loader>
              </div>
            }
          </div>
          
          <!-- Email Footer -->
          <div class="p-4 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-200 dark:border-zinc-700 flex justify-between items-center">
            <button class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed border-none">
              Send
            </button>
            <div class="flex items-center gap-3 text-slate-400 text-lg">
              <i class="bi bi-paperclip"></i>
              <i class="bi bi-image"></i>
              <i class="bi bi-emoji-smile"></i>
              <i class="bi bi-trash"></i>
            </div>
          </div>

        </div>

      </div>
    </app-demo-layout>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class WriteEmailDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'write-email')!;
  
  _apiChoice: 'writer' | 'prompt' = 'writer';
  
  get apiChoice() { return this._apiChoice; }
  set apiChoice(val: 'writer' | 'prompt') {
    this._apiChoice = val;
    this.checkApiAvailability();
  }

  sourceText = '';
  emailBody = '';
  apiAvailabilityStatus: 'loading...' | 'available' | 'downloading' | 'downloadable' | 'unavailable' | 'unknown' = 'loading...';
  
  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.sourceText = this.demo.initialPrompt;
    await this.checkApiAvailability();
  }

  async checkApiAvailability() {
    this.apiAvailabilityStatus = 'loading...';
    try {
      if (this.apiChoice === 'writer') {
        if ('Writer' in self && 'availability' in Writer) {
          this.apiAvailabilityStatus = await Writer.availability();
        } else {
          this.apiAvailabilityStatus = 'unavailable';
        }
      } else {
        if ('LanguageModel' in self && 'availability' in LanguageModel) {
          this.apiAvailabilityStatus = await LanguageModel.availability();
        } else {
          this.apiAvailabilityStatus = 'unavailable';
        }
      }
    } catch(e) {
      this.apiAvailabilityStatus = 'unavailable';
    }
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    
    if (this.apiChoice === 'writer') {
      return `const writer = await Writer.create({
  tone: "formal",
  length: "medium"
});

const stream = writer.writeStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  emailBodyTextarea.value = chunk;
}`;
    } else {
      return `const session = await LanguageModel.create({
  systemPrompt: "${systemPrompt}"
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  emailBodyTextarea.value += chunk;
}`;
    }
  }

  async draftEmail() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.emailBody = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    
    try {
      if (this.apiChoice === 'writer') {
        const writer = await Writer.create({ tone: 'formal', length: 'medium' });
        const stream = writer.writeStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.emailBody = chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
        
      } else {
        const session = await LanguageModel.create({
          systemPrompt,
        });
        
        const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.emailBody += chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.emailBody = 'Error drafting email: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelDraft() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
