import {Component, Inject, PLATFORM_ID} from '@angular/core';
import {LocaleInterface} from '../../interfaces/locale.interface';
import {LOCALES} from '../../constants/locales.constant';
import {LOCALES_MAP} from '../../constants/locales-map.constant';
import {isPlatformServer} from '@angular/common';
import {FormControl} from '@angular/forms';
import {Dialog} from '@angular/cdk/dialog';
import {TranslationCodeModal} from '../../components/translation-code-modal/translation-code-modal';

@Component({
  selector: 'lib-translation',
  standalone: false,
  templateUrl: './translation.page.html',
  styleUrl: './translation.page.scss',
  host: {
    class: 'block h-full w-full flex flex-col min-h-0'
  }
})
export class TranslationPage {
  protected readonly locales = LOCALES;

  protected detectedLanguage?:LocaleInterface;

  protected sourceLocale?: LocaleInterface;

  protected destinationLocale?: LocaleInterface = LOCALES_MAP['es'];

  protected recentSourceLocales: LocaleInterface[] = [
    LOCALES_MAP['fr'],
    LOCALES_MAP['en'],
  ];

  protected recentDestinationLocales: LocaleInterface[] = [
    LOCALES_MAP['es'],
    LOCALES_MAP['pt'],
  ];

  languagePacksDownload:{sourceLocale: LocaleInterface, destinationLocale: LocaleInterface, progress: number, status: 'downloading' | 'completed' | 'unavailable'}[] = [];

  // @ts-expect-error
  translator: Translator;

  textareaFormControl = new FormControl('');

  translatedText = '';
  
  apiAvailabilityStatus: 'loading...' | 'available' | 'downloading' | 'downloadable' | 'unavailable' | 'unknown' = 'unknown';

  sourceSearchTerm = '';
  destinationSearchTerm = '';
  isSourceDropdownOpen = false;
  isDestinationDropdownOpen = false;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly dialog: Dialog,
  ){
  }

  ngOnInit() {
    this.setupTranslator();
  }

  openCodeModal() {
    this.dialog.open(TranslationCodeModal, {
      panelClass: ['w-[90vw]', 'max-w-6xl', 'mx-auto', 'bg-transparent', 'shadow-none'],
      hasBackdrop: true,
      backdropClass: 'bg-black/50',
      data: {
        sourceLanguage: this.sourceLocale,
        targetLanguage: this.destinationLocale
      }
    });
  }

  getFilteredLocales(term: string): LocaleInterface[] {
    if (!term) return this.locales;
    const lowerTerm = term.toLowerCase();
    return this.locales.filter(locale => 
      locale.language.toLowerCase().includes(lowerTerm) || 
      locale.code.toLowerCase().includes(lowerTerm)
    );
  }

  getApiAvailability(): 'loading...' | 'available' | 'downloading' | 'downloadable' | 'unavailable' | 'unknown' {
    return this.apiAvailabilityStatus;
  }

  getDownloadStatus(): 'idle' | 'downloading' | 'completed' | 'unavailable' {
    if(this.languagePacksDownload.length === 0) {
      return 'idle';
    }

    if(this.languagePacksDownload.some(l => l.status === 'downloading')) {
      return 'downloading';
    }

    if(this.languagePacksDownload.some(l => l.status === 'unavailable')) {
      return 'unavailable';
    }


    return 'completed';
  }

  onDetectLanguageClick(): void {
    this.sourceLocale = undefined;
  }

  onRecentSourceLanguageClick(locale: LocaleInterface): void {
    this.sourceLocale = locale;

    this.setupTranslator();
  }

  onRecentDestinationLanguageClick(locale: LocaleInterface): void {
    this.destinationLocale = locale;

    this.setupTranslator();
  }

  onSourceLanguageSelect(locale: LocaleInterface): void {
    this.sourceLocale = locale;
    this.recentSourceLocales = [
      locale,
      ...this.recentSourceLocales.filter(l => l.code !== locale.code)
    ].slice(0, 3);

    this.setupTranslator();
  }

  onDestinationLanguageSelect(locale: LocaleInterface): void {
    this.destinationLocale = locale;
    this.recentDestinationLocales = [
      locale,
      ...this.recentDestinationLocales.filter(l => l.code !== locale.code)
    ].slice(0, 3);

    this.setupTranslator();
  }

  onSwapLanguagesClick(): void {
    const source = this.sourceLocale;
    const dest = this.destinationLocale;

    if (dest) {
      this.onSourceLanguageSelect(dest);
    } else {
      this.onDetectLanguageClick();
    }

    if (source) {
      this.onDestinationLanguageSelect(source);
    } else {
      this.destinationLocale = undefined;
    }
  }

  async setupTranslator() {
    this.apiAvailabilityStatus = 'loading...';
    
    if(
      isPlatformServer(this.platformId) ||
      !("Translator" in self)
    ) {
      this.apiAvailabilityStatus = 'unavailable';
      return;
    }

    if (!this.sourceLocale || !this.destinationLocale || this.sourceLocale === this.destinationLocale) {
       // if we are detecting language we need to know if detection is available
       if (!this.sourceLocale) {
         try {
            if ("LanguageDetector" in self && "availability" in (self as any).LanguageDetector) {
              const availability = await (self as any).LanguageDetector.availability();
              this.apiAvailabilityStatus = availability;
            } else if ("languageDetector" in self) {
              const capabilities = await (self as any).languageDetector.capabilities();
              this.apiAvailabilityStatus = capabilities.available;
            } else {
              this.apiAvailabilityStatus = 'unknown';
            }
         } catch (e) {
            this.apiAvailabilityStatus = 'unknown';
         }
       } else {
         this.apiAvailabilityStatus = 'unknown';
       }
       return;
    }

    try {
        if ("Translator" in self && "availability" in (self as any).Translator) {
            this.apiAvailabilityStatus = await (self as any).Translator.availability({
                sourceLanguage: this.sourceLocale.code,
                targetLanguage: this.destinationLocale.code
            });
        } else {
            this.apiAvailabilityStatus = 'unavailable';
        }
    } catch(e) {
        this.apiAvailabilityStatus = 'unavailable';
        return;
    }

    await this.createTranslator(this.sourceLocale, this.destinationLocale)
  }

  async createTranslator(sourceLocale: LocaleInterface, targetLocale: LocaleInterface) {
    const languagePacksDownload: {
      sourceLocale: LocaleInterface;
      destinationLocale: LocaleInterface;
      progress: number;
      status: "downloading" | "completed" | "unavailable";
    } = {
      sourceLocale: sourceLocale,
      destinationLocale: targetLocale,
      progress: 0,
      status: 'downloading'
    }

    this.languagePacksDownload.push(languagePacksDownload);

    try {
      this.translator = await Translator.create({
        sourceLanguage: sourceLocale.code,
        targetLanguage: targetLocale.code,
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            languagePacksDownload.progress = e.loaded;
          });
        },
      });

      languagePacksDownload.status = 'completed';
    } catch (e) {
      languagePacksDownload.status = 'unavailable';
      console.error(e);
    }
  }

  async translate() {
    if(!this.destinationLocale) {
      return;
    }

    if(!this.sourceLocale) {
      // Use the language detector API to find the locale.
      const detector = await LanguageDetector.create();

      const locales = await detector.detect(this.textareaFormControl.value ?? "");
      console.log(locales);

      if(locales[0].detectedLanguage === 'und') {
        return; // todo: add a visual error.
      }

      this.detectedLanguage = LOCALES_MAP[locales[0].detectedLanguage ?? "en"] as LocaleInterface;

      await this.createTranslator(this.detectedLanguage, this.destinationLocale);
    }

    this.translatedText = await this.translator.translate(this.textareaFormControl.value ?? "");
  }
}
