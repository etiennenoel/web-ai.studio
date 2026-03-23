import { Component, OnInit } from '@angular/core';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';
import { LOCALES } from '../../../constants/locales.constant';

declare const Translator: any;
declare const LanguageDetector: any;
declare const LanguageModel: any;

@Component({
  selector: 'app-translation-demo',
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
        
        <div class="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="inline-flex bg-slate-200/50 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button class="px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none outline-none focus:outline-none"
                    [ngClass]="apiChoice === 'translator' ? 'bg-[#ffffff] dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-600/50' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'"
                    (click)="apiChoice = 'translator'">
              Translator API
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
            } @else if (apiAvailabilityStatus === 'loading...') {
              <span class="text-slate-600 dark:text-slate-400 flex items-center gap-1"><i class="bi bi-hourglass-split"></i> Loading...</span>
            } @else {
              <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1"><i class="bi bi-arrow-down-circle-fill"></i> Download Required</span>
            }
          </div>
        </div>

        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 flex flex-col md:flex-row min-h-[300px] overflow-hidden">
          
          <!-- Source -->
          <div class="flex-1 flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-700/80">
            <div class="px-5 py-3 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/30 flex justify-between items-center">
              <select [(ngModel)]="sourceLang" (change)="checkApiAvailability()" class="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 border-none outline-none focus:ring-0 cursor-pointer">
                <option value="auto">Auto-Detect {{ detectedLangName ? '(' + detectedLangName + ')' : '' }}</option>
                @for (loc of topLocales; track loc.code) {
                  <option [value]="loc.code">{{ loc.language }}</option>
                }
              </select>
            </div>
            <textarea class="w-full flex-grow bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none text-lg p-5 pb-16 leading-relaxed" 
                      [(ngModel)]="sourceText" 
                      placeholder="Type text to translate..."></textarea>
            
            <div class="absolute bottom-0 left-0 right-0 p-4 flex justify-end pointer-events-none">
              @if (state === 'Inferencing') {
                <button class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-all active:scale-95 border-none pointer-events-auto"
                        (click)="onCancelTranslation()">
                  <i class="bi bi-stop-fill text-lg"></i> Stop
                </button>
              } @else {
                <button class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none pointer-events-auto" 
                        (click)="translate()"
                        [disabled]="!sourceText.trim() || apiAvailabilityStatus === 'unavailable'">
                  <i class="bi bi-translate text-lg"></i> Translate
                </button>
              }
            </div>
          </div>

          <!-- Destination -->
          <div class="flex-1 flex flex-col bg-slate-50/30 dark:bg-[#161616]/30">
            <div class="px-5 py-3 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/30 flex justify-between items-center">
              <select [(ngModel)]="targetLang" (change)="checkApiAvailability()" class="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 border-none outline-none focus:ring-0 cursor-pointer">
                @for (loc of topLocales; track loc.code) {
                  <option [value]="loc.code">{{ loc.language }}</option>
                }
              </select>
              @if (state === 'Inferencing') {
                <app-latency-loader></app-latency-loader>
              }
            </div>
            <div class="w-full flex-grow text-slate-800 dark:text-slate-200 text-lg p-5 leading-relaxed overflow-y-auto break-words">
              @if(translatedText) {
                {{ translatedText }}
              } @else {
                <span class="text-slate-400 dark:text-slate-500 font-light select-none">Translation will appear here...</span>
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
export class TranslationDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'translation')!;
  
  _apiChoice: 'translator' | 'prompt' = 'translator';
  
  // Hardcode a few common top locales for the demo dropdowns for simplicity,
  // while retaining the full LOCALES array if needed.
  topLocales = LOCALES.filter(l => ['en', 'fr', 'es', 'de', 'ja', 'zh'].includes(l.code));
  
  sourceLang = 'auto';
  targetLang = 'fr';
  detectedLangName = '';

  get apiChoice() { return this._apiChoice; }
  set apiChoice(val: 'translator' | 'prompt') {
    this._apiChoice = val;
    this.checkApiAvailability();
  }

  sourceText = '';
  translatedText = '';
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
      if (this.apiChoice === 'translator') {
        if ('Translator' in self && 'availability' in Translator) {
          // If auto, we can't fully check translator availability until we detect,
          // but we can check if the API is there. For the sake of UX, assume 'available' or 'downloadable'
          // based on a generic check, or wait for actual runtime.
          if (this.sourceLang === 'auto') {
             if ('LanguageDetector' in self) {
               this.apiAvailabilityStatus = await (self as any).LanguageDetector.availability();
             } else {
               this.apiAvailabilityStatus = 'unknown'; // Will fail at runtime
             }
          } else {
             this.apiAvailabilityStatus = await Translator.availability({ sourceLanguage: this.sourceLang, targetLanguage: this.targetLang });
          }
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

  getTargetLangName() {
    return this.topLocales.find(l => l.code === this.targetLang)?.language || this.targetLang;
  }
  
  getSourceLangName() {
    return this.topLocales.find(l => l.code === this.sourceLang)?.language || this.sourceLang;
  }

  get dynamicCodeSnippet() {
    const escapedPrompt = this.sourceText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const targetName = this.getTargetLangName();
    
    if (this.apiChoice === 'translator') {
      if (this.sourceLang === 'auto') {
        return `// 1. Detect Language
const detector = await LanguageDetector.create();
const results = await detector.detect("${escapedPrompt}");
const detectedLang = results[0].detectedLanguage;

// 2. Translate
const translator = await Translator.create({
  sourceLanguage: detectedLang,
  targetLanguage: '${this.targetLang}'
});

const result = await translator.translate("${escapedPrompt}");
console.log(result);`;
      } else {
        return `const translator = await Translator.create({
  sourceLanguage: '${this.sourceLang}',
  targetLanguage: '${this.targetLang}'
});

const result = await translator.translate("${escapedPrompt}");
console.log(result);`;
      }
    } else {
      let systemPrompt = `Translate the following text to ${targetName}.`;
      if (this.sourceLang !== 'auto') {
        const sourceName = this.getSourceLangName();
        systemPrompt = `Translate the following text from ${sourceName} to ${targetName}.`;
      }
      
      return `const session = await LanguageModel.create({
  systemPrompt: "${systemPrompt}"
});

const stream = session.promptStreaming("${escapedPrompt}");
for await (const chunk of stream) {
  console.log(chunk);
}`;
    }
  }

  async translate() {
    if (!this.sourceText.trim()) return;
    
    this.state = PromptInputStateEnum.Inferencing;
    this.translatedText = '';
    this.detectedLangName = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let actualSourceLangCode = this.sourceLang;
    
    try {
      // Handle Auto-Detect
      if (this.sourceLang === 'auto') {
        if ('LanguageDetector' in self) {
          const detector = await LanguageDetector.create();
          const results = await detector.detect(this.sourceText);
          if (results && results.length > 0 && results[0].detectedLanguage !== 'und') {
            actualSourceLangCode = results[0].detectedLanguage;
            
            // Map code back to name if possible
            const fullLocale = LOCALES.find(l => l.code === actualSourceLangCode || l.code.split('-')[0] === actualSourceLangCode);
            this.detectedLangName = fullLocale ? fullLocale.language : actualSourceLangCode;
          } else {
             actualSourceLangCode = 'en'; // fallback
             this.detectedLangName = 'Unknown, assumed English';
          }
        } else {
          throw new Error("LanguageDetector API not available for auto-detect.");
        }
      }

      if (this.apiChoice === 'translator') {
        const translator = await Translator.create({
          sourceLanguage: actualSourceLangCode,
          targetLanguage: this.targetLang
        });
        
        this.translatedText = await translator.translate(this.sourceText, { signal: this.abortController.signal });
        
        const endTime = performance.now();
        this.ttft = Math.round(endTime - startTime);
        this.totalTime = Math.round(endTime - startTime);
        
      } else {
        const targetName = this.getTargetLangName();
        let systemPrompt = `Translate the following text to ${targetName}.`;
        if (this.sourceLang !== 'auto') {
           const sourceName = this.getSourceLangName();
           systemPrompt = `Translate the following text from ${sourceName} to ${targetName}.`;
        }

        const session = await LanguageModel.create({
          systemPrompt: systemPrompt
        });
        
        const stream = session.promptStreaming(this.sourceText, { signal: this.abortController.signal });
        
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.translatedText += chunk;
        }
        
        const endTime = performance.now();
        this.totalTime = Math.round(endTime - startTime);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        this.translatedText = 'Error executing translation: ' + e.message;
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  onCancelTranslation() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = PromptInputStateEnum.Ready;
  }
}
