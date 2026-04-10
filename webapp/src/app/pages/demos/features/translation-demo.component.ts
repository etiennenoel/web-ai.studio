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
  templateUrl: './translation-demo.component.html',
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
