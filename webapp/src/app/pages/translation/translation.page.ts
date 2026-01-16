import {Component, Inject, PLATFORM_ID} from '@angular/core';
import {LocaleInterface} from '../../interfaces/locale.interface';
import {LOCALES} from '../../constants/locales.constant';
import {LOCALES_MAP} from '../../constants/locales-map.constant';
import {isPlatformServer} from '@angular/common';
import {FormControl} from '@angular/forms';

@Component({
  selector: 'lib-translation',
  standalone: false,
  templateUrl: './translation.page.html',
  styleUrl: './translation.page.scss'
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

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object){
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
    if(
      isPlatformServer(this.platformId) ||
      !("Translator" in self) ||
      !this.sourceLocale ||
      !this.destinationLocale ||
      this.sourceLocale === this.destinationLocale
    ) {
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
