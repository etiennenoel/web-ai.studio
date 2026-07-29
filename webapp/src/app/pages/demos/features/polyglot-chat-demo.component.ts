import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageDetector: any;
declare const Translator: any;

interface ChatMessage {
  paneIndex: number;
  original: string;
  detectedLanguage: string | null;
  detectedConfidence: number | null;
  translations: Record<string, string>;
  showOriginal: boolean;
  isTranslating: boolean;
  translateMs: number | null;
}

interface ChatPane {
  speaker: string;
  avatar: string;
  lang: string;
  draft: string;
  starters: string[];
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' }
];

@Component({
  selector: 'app-polyglot-chat-demo',
  templateUrl: './polyglot-chat-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class PolyglotChatDemoComponent extends BasePage implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'polyglot-chat')!;

  languages = LANGUAGES;

  panes: ChatPane[] = [
    {
      speaker: 'Amélie',
      avatar: '👩🏻‍🎨',
      lang: 'fr',
      draft: '',
      starters: ['Bonjour ! Comment ça va aujourd\'hui ?', 'On se voit toujours demain à midi ?', 'J\'ai adoré les photos de ton voyage !']
    },
    {
      speaker: 'Sam',
      avatar: '🧑🏽‍💻',
      lang: 'en',
      draft: '',
      starters: ['Hey! All good here, how about you?', 'Yes, noon works perfectly for me.', 'Thanks! The mountains were incredible.']
    }
  ];

  messages: ChatMessage[] = [];

  detectorStatus = 'loading...';
  translatorStatus = 'loading...';
  errorMessage = '';

  private detector: any = null;
  private translators = new Map<string, any>();

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    super(document, title);
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    try {
      this.detectorStatus = 'LanguageDetector' in self ? await LanguageDetector.availability() : 'unavailable';
    } catch { this.detectorStatus = 'unavailable'; }

    try {
      this.translatorStatus = 'Translator' in self
        ? await Translator.availability({ sourceLanguage: this.panes[0].lang, targetLanguage: this.panes[1].lang })
        : 'unavailable';
    } catch { this.translatorStatus = 'unavailable'; }
  }

  get statusPills() {
    return [
      { name: 'Language Detector', status: this.detectorStatus },
      { name: 'Translator', status: this.translatorStatus }
    ];
  }

  languageLabel(code: string | null): string {
    if (!code) return '';
    return this.languages.find(l => l.code === code)?.label ?? code;
  }

  useStarter(pane: ChatPane, starter: string) {
    pane.draft = starter;
    this.send(pane);
  }

  async send(pane: ChatPane) {
    const text = pane.draft.trim();
    if (!text) return;

    const paneIndex = this.panes.indexOf(pane);
    const message: ChatMessage = {
      paneIndex,
      original: text,
      detectedLanguage: null,
      detectedConfidence: null,
      translations: {},
      showOriginal: false,
      isTranslating: true,
      translateMs: null
    };
    this.messages.push(message);
    pane.draft = '';
    this.errorMessage = '';

    const start = performance.now();
    try {
      // 1. Detect what was actually typed (senders don't always use "their" language)
      let sourceLanguage = pane.lang;
      if (this.detectorStatus !== 'unavailable') {
        if (!this.detector) this.detector = await LanguageDetector.create();
        const results = await this.detector.detect(text);
        if (results?.length && results[0].detectedLanguage !== 'und') {
          sourceLanguage = results[0].detectedLanguage;
          message.detectedLanguage = sourceLanguage;
          message.detectedConfidence = results[0].confidence;
        }
      }

      // 2. Translate for every pane that reads a different language
      for (const target of this.panes) {
        if (target.lang === sourceLanguage) {
          message.translations[target.lang] = text;
          continue;
        }
        const key = `${sourceLanguage}->${target.lang}`;
        if (!this.translators.has(key)) {
          this.translators.set(key, await Translator.create({
            sourceLanguage,
            targetLanguage: target.lang
          }));
        }
        message.translations[target.lang] = await this.translators.get(key).translate(text);
      }
      message.translateMs = Math.round(performance.now() - start);
    } catch (e: any) {
      this.errorMessage = e.message || 'Translation failed — is this language pair available on this device?';
      message.translations[pane.lang] = text;
    } finally {
      message.isTranslating = false;
    }
  }

  /** What a given pane displays for a message: its own language when available. */
  displayText(message: ChatMessage, pane: ChatPane): string {
    return message.translations[pane.lang] ?? message.original;
  }

  isTranslatedFor(message: ChatMessage, pane: ChatPane): boolean {
    const shown = message.translations[pane.lang];
    return shown !== undefined && shown !== message.original;
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
