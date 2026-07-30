import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageDetector: any;
declare const Translator: any;

interface Snippet {
  text: string;
  language: string;
}

interface RoundResult {
  snippet: Snippet;
  playerGuess: string;
  playerCorrect: boolean;
  detectorTop: { language: string; confidence: number } | null;
  detectorCorrect: boolean;
  translation: string | null;
}

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French', es: 'Spanish', de: 'German', it: 'Italian', pt: 'Portuguese',
  nl: 'Dutch', sv: 'Swedish', pl: 'Polish', tr: 'Turkish', ja: 'Japanese',
  fi: 'Finnish', da: 'Danish', ro: 'Romanian', no: 'Norwegian', cs: 'Czech'
};

const SNIPPETS: Snippet[] = [
  { text: 'Qui vivra verra, dit-on souvent par ici.', language: 'fr' },
  { text: 'No hay mal que por bien no venga, decía mi abuela.', language: 'es' },
  { text: 'Übung macht den Meister, sagt man bei uns.', language: 'de' },
  { text: 'Chi dorme non piglia pesci, ricordalo sempre.', language: 'it' },
  { text: 'Quem não arrisca, não petisca — é o que dizem.', language: 'pt' },
  { text: 'Wie het laatst lacht, lacht het best, zeggen wij.', language: 'nl' },
  { text: 'Borta bra men hemma bäst, brukar vi säga.', language: 'sv' },
  { text: 'Nie ma tego złego, co by na dobre nie wyszło.', language: 'pl' },
  { text: 'Damlaya damlaya göl olur, derler bizde.', language: 'tr' },
  { text: '猿も木から落ちると言いますからね。', language: 'ja' },
  { text: 'Ei kukaan ole seppä syntyessään, sanotaan meillä.', language: 'fi' },
  { text: 'Øvelse gør mester, plejer vi at sige.', language: 'da' },
  { text: 'Cine se scoală de dimineață departe ajunge.', language: 'ro' }
];

const TOTAL_ROUNDS = 8;

@Component({
  selector: 'app-mystery-language-demo',
  templateUrl: './mystery-language-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class MysteryLanguageDemoComponent extends BasePage implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'mystery-language')!;

  detectorStatus = 'loading...';
  errorMessage = '';

  round = 0;
  totalRounds = TOTAL_ROUNDS;
  playerScore = 0;
  detectorScore = 0;

  current: Snippet | null = null;
  options: string[] = [];
  phase: 'guessing' | 'revealed' | 'finished' = 'guessing';
  lastResult: RoundResult | null = null;
  isRevealing = false;

  private detector: any = null;
  private translators = new Map<string, any>();
  private remaining: Snippet[] = [];

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

    this.startMatch();
  }

  get statusPills() {
    return [{ name: 'Language Detector', status: this.detectorStatus }];
  }

  languageName(code: string): string {
    return LANGUAGE_NAMES[code] ?? code;
  }

  startMatch() {
    this.remaining = [...SNIPPETS].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS);
    this.round = 0;
    this.playerScore = 0;
    this.detectorScore = 0;
    this.lastResult = null;
    this.nextRound();
  }

  private nextRound() {
    if (this.remaining.length === 0) {
      this.phase = 'finished';
      this.current = null;
      return;
    }

    this.current = this.remaining.pop()!;
    this.round++;
    this.phase = 'guessing';
    this.lastResult = null;

    // The correct answer plus three decoys, shuffled.
    const decoys = Object.keys(LANGUAGE_NAMES)
      .filter(code => code !== this.current!.language)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    this.options = [this.current.language, ...decoys].sort(() => Math.random() - 0.5);
  }

  async guess(code: string) {
    if (this.phase !== 'guessing' || !this.current || this.isRevealing) return;

    this.isRevealing = true;
    this.errorMessage = '';
    const snippet = this.current;

    const result: RoundResult = {
      snippet,
      playerGuess: code,
      playerCorrect: code === snippet.language,
      detectorTop: null,
      detectorCorrect: false,
      translation: null
    };

    try {
      // The detector plays the same round.
      if (this.detectorStatus !== 'unavailable') {
        if (!this.detector) this.detector = await LanguageDetector.create();
        const detections = await this.detector.detect(snippet.text);
        const top = detections?.[0];
        if (top && top.detectedLanguage !== 'und') {
          result.detectorTop = { language: top.detectedLanguage, confidence: top.confidence };
          result.detectorCorrect = top.detectedLanguage === snippet.language;
        }
      }

      // Best effort: reveal what the snippet means.
      if ('Translator' in self) {
        try {
          const key = `${snippet.language}->en`;
          if (!this.translators.has(key)) {
            this.translators.set(key, await Translator.create({
              sourceLanguage: snippet.language,
              targetLanguage: 'en'
            }));
          }
          result.translation = await this.translators.get(key).translate(snippet.text);
        } catch {
          result.translation = null;
        }
      }

      if (result.playerCorrect) this.playerScore++;
      if (result.detectorCorrect) this.detectorScore++;
      this.lastResult = result;
      this.phase = 'revealed';
    } catch (e: any) {
      this.errorMessage = e.message || 'The reveal failed.';
    } finally {
      this.isRevealing = false;
    }
  }

  continueMatch() {
    if (this.phase !== 'revealed') return;
    this.nextRound();
  }

  get verdictLine(): string {
    if (this.playerScore > this.detectorScore) return 'You beat the Language Detector. Impressive.';
    if (this.playerScore < this.detectorScore) return 'The Language Detector wins this one.';
    return 'A tie — you and the detector are equally polyglot.';
  }

  get dynamicCodeSnippet(): string {
    const snippet = this.lastResult?.snippet ?? SNIPPETS[0];
    return `const detector = await LanguageDetector.create();

// The player guesses first...
const playerGuess = ${JSON.stringify(this.lastResult?.playerGuess ?? 'it')};

// ...then the detector shows its ranked answer
const results = await detector.detect(${JSON.stringify(snippet.text)});
// [{ detectedLanguage: ${JSON.stringify(this.lastResult?.detectorTop?.language ?? snippet.language)}, confidence: ${this.lastResult?.detectorTop ? this.lastResult.detectorTop.confidence.toFixed(2) : '0.98'} }, ...]

const [top] = results;
if (playerGuess === top.detectedLanguage) score.player++;
if (top.detectedLanguage === answer) score.detector++;

// Reveal what it means with the Translator
const translator = await Translator.create({
  sourceLanguage: top.detectedLanguage,
  targetLanguage: "en"
});
console.log(await translator.translate(${JSON.stringify(snippet.text)}));${this.lastResult?.translation ? `\n// "${this.lastResult.translation.replace(/"/g, '\\"')}"` : ''}`;
  }
}
