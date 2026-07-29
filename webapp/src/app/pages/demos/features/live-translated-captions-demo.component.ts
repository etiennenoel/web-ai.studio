import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseSpeechDemoComponent } from '../components/base-demo/base-speech-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageDetector: any;
declare const Translator: any;

interface CaptionSegment {
  original: string;
  translated: string | null;
  detectedLanguage: string | null;
  translateMs: number | null;
}

const SPOKEN_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'de-DE', label: 'German' },
  { code: 'ja-JP', label: 'Japanese' }
];

const TARGET_LANGUAGES = [
  { code: 'fr', label: 'French' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' }
];

@Component({
  selector: 'app-live-translated-captions-demo',
  templateUrl: './live-translated-captions-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class LiveTranslatedCaptionsDemoComponent extends BaseSpeechDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'live-translated-captions')!;

  spokenLanguages = SPOKEN_LANGUAGES;
  targetLanguages = TARGET_LANGUAGES;
  spokenLang = 'en-US';
  targetLang = 'fr';

  detectorStatus = 'loading...';
  translatorStatus = 'loading...';

  segments: CaptionSegment[] = [];
  interim = '';
  lastDetected: { language: string; confidence: number } | null = null;

  private detector: any = null;
  private translators = new Map<string, any>();
  private processedFinalCount = 0;
  private translationQueue: Promise<void> = Promise.resolve();

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    await this.checkSpeechAvailability({ lang: this.spokenLang, quality: 'dictation' });

    try {
      this.detectorStatus = 'LanguageDetector' in self ? await LanguageDetector.availability() : 'unavailable';
    } catch { this.detectorStatus = 'unavailable'; }

    try {
      this.translatorStatus = 'Translator' in self
        ? await Translator.availability({ sourceLanguage: this.baseLang(this.spokenLang), targetLanguage: this.targetLang })
        : 'unavailable';
    } catch { this.translatorStatus = 'unavailable'; }
  }

  get statusPills() {
    return [
      { name: 'Web Speech (on-device)', status: this.speechStatus },
      { name: 'Language Detector', status: this.detectorStatus },
      { name: 'Translator', status: this.translatorStatus }
    ];
  }

  private baseLang(locale: string): string {
    return locale.split('-')[0];
  }

  async onSpokenLangChanged() {
    await this.checkSpeechAvailability({ lang: this.spokenLang, quality: 'dictation' });
  }

  async start() {
    if (this.isListening || this.speechStatus !== 'available') return;

    this.errorMessage = '';
    this.segments = [];
    this.interim = '';
    this.lastDetected = null;
    this.processedFinalCount = 0;

    try {
      if (!this.detector && this.detectorStatus !== 'unavailable') {
        this.detector = await LanguageDetector.create();
      }
      this.recognition = this.webSpeech.createRecognizer({
        lang: this.spokenLang,
        quality: 'dictation',
        continuous: true,
        interimResults: true
      });
    } catch (e: any) {
      this.errorMessage = e.message;
      return;
    }

    const r = this.recognition;
    this.isListening = true;

    r.onresult = (event: any) => this.ngZone.run(() => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          interim += result[0].transcript;
        } else if (i >= this.processedFinalCount) {
          // A newly finalized segment: caption it, then translate it in order.
          this.processedFinalCount = i + 1;
          const segment: CaptionSegment = {
            original: result[0].transcript.trim(),
            translated: null,
            detectedLanguage: null,
            translateMs: null
          };
          if (segment.original) {
            this.segments.push(segment);
            this.translationQueue = this.translationQueue.then(() => this.translateSegment(segment));
          }
        }
      }
      this.interim = interim;
    });

    r.onerror = (event: any) => this.ngZone.run(() => {
      this.errorMessage = event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow the mic to start captioning.'
        : `Recognition error: ${event.error}`;
    });

    r.onend = () => this.ngZone.run(() => {
      this.isListening = false;
      this.interim = '';
      this.recognition = null;
    });

    r.start();
  }

  stop() {
    this.stopRecognition();
  }

  private async translateSegment(segment: CaptionSegment) {
    const start = performance.now();
    try {
      let sourceLanguage = this.baseLang(this.spokenLang);

      if (this.detector) {
        const results = await this.detector.detect(segment.original);
        if (results?.length && results[0].detectedLanguage !== 'und') {
          sourceLanguage = results[0].detectedLanguage;
          this.ngZone.run(() => {
            segment.detectedLanguage = sourceLanguage;
            this.lastDetected = { language: sourceLanguage, confidence: results[0].confidence };
          });
        }
      }

      if (sourceLanguage === this.targetLang) {
        this.ngZone.run(() => {
          segment.translated = segment.original;
          segment.translateMs = 0;
        });
        return;
      }

      const key = `${sourceLanguage}->${this.targetLang}`;
      if (!this.translators.has(key)) {
        this.translators.set(key, await Translator.create({
          sourceLanguage,
          targetLanguage: this.targetLang
        }));
      }
      const translated = await this.translators.get(key).translate(segment.original);
      this.ngZone.run(() => {
        segment.translated = translated;
        segment.translateMs = Math.round(performance.now() - start);
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        segment.translated = `[translation failed: ${e.message}]`;
      });
    }
  }

  languageLabel(code: string | null): string {
    if (!code) return '';
    return this.targetLanguages.find(l => l.code === code)?.label ?? code;
  }

  get dynamicCodeSnippet(): string {
    return `// On-device recognition (explainer: on-device-speech-recognition)
const options = { langs: ["${this.spokenLang}"], processLocally: true, quality: "dictation" };
if (await SpeechRecognition.available(options) === "downloadable") {
  await SpeechRecognition.install(options);
}

const recognition = new SpeechRecognition();
recognition.options = options;
recognition.continuous = true;
recognition.interimResults = true;

const detector = await LanguageDetector.create();
const translators = new Map(); // cached per language pair

recognition.onresult = async (event) => {
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    showCaption(result[0].transcript, result.isFinal);
    if (!result.isFinal) continue;

    // New final segment: detect its language, then translate it
    const [{ detectedLanguage }] = await detector.detect(result[0].transcript);
    const key = detectedLanguage + "->${this.targetLang}";
    if (!translators.has(key)) {
      translators.set(key, await Translator.create({
        sourceLanguage: detectedLanguage, targetLanguage: "${this.targetLang}"
      }));
    }
    showTranslatedCaption(await translators.get(key).translate(result[0].transcript));
  }
};

recognition.start();`;
  }
}
