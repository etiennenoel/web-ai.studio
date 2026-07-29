import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseSpeechDemoComponent } from '../components/base-demo/base-speech-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { SpeechQuality } from '../../../core/services/web-speech.service';

interface DiffToken {
  text: string;
  kind: 'match' | 'sub' | 'ins' | 'del';
}

interface TierState {
  value: SpeechQuality;
  label: string;
  hint: string;
  availability: string;
  isInstalling: boolean;
  transcript: string;
  interim: string;
  setupMs: number | null;
  soundToFirstWordMs: number | null;
  accuracy: number | null;
  substitutions: number;
  insertions: number;
  deletions: number;
  diff: DiffToken[];
  recorded: boolean;
}

const REFERENCE_PASSAGE =
  'The quick brown fox jumps over the lazy dog while seventeen curious penguins watch from the frozen harbor. ' +
  'Please schedule a briefing for Thursday at quarter past nine, and remember that the observatory telescope requires careful calibration before every single use.';

@Component({
  selector: 'app-asr-quality-tiers-demo',
  templateUrl: './asr-quality-tiers-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class AsrQualityTiersDemoComponent extends BaseSpeechDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'asr-quality-tiers')!;

  referenceText = REFERENCE_PASSAGE;

  tiers: TierState[] = [
    { value: 'command', label: 'Command', hint: 'Smallest model — short phrases, limited vocabulary.', availability: 'loading...', isInstalling: false, transcript: '', interim: '', setupMs: null, soundToFirstWordMs: null, accuracy: null, substitutions: 0, insertions: 0, deletions: 0, diff: [], recorded: false },
    { value: 'dictation', label: 'Dictation', hint: 'Mid-size model — continuous single-speaker speech.', availability: 'loading...', isInstalling: false, transcript: '', interim: '', setupMs: null, soundToFirstWordMs: null, accuracy: null, substitutions: 0, insertions: 0, deletions: 0, diff: [], recorded: false },
    { value: 'conversation', label: 'Conversation', hint: 'Largest model — complex vocabulary, high noise.', availability: 'loading...', isInstalling: false, transcript: '', interim: '', setupMs: null, soundToFirstWordMs: null, accuracy: null, substitutions: 0, insertions: 0, deletions: 0, diff: [], recorded: false }
  ];

  activeTier: SpeechQuality | null = null;

  private startCallTime = 0;
  private soundStartTime = 0;
  private firstSoundCaptured = false;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    // Availability is per quality tier — each maps to a different on-device model.
    await Promise.all(this.tiers.map(async tier => {
      tier.availability = await this.webSpeech.available({ quality: tier.value });
    }));
    this.speechStatus = this.tiers.some(t => t.availability !== 'unavailable') ? 'available' : 'unavailable';
  }

  get anyTierUsable(): boolean {
    return this.tiers.some(t => t.availability === 'available');
  }

  async installTier(tier: TierState) {
    tier.isInstalling = true;
    this.errorMessage = '';
    try {
      const installed = await this.webSpeech.install({ quality: tier.value });
      if (installed) tier.availability = 'available';
      else this.errorMessage = `Could not install the ${tier.label} model.`;
    } catch (e: any) {
      this.errorMessage = e.message || 'Installation failed.';
    } finally {
      tier.isInstalling = false;
    }
  }

  record(tier: TierState) {
    if (this.activeTier || tier.availability !== 'available') return;

    this.errorMessage = '';
    tier.transcript = '';
    tier.interim = '';
    tier.setupMs = null;
    tier.soundToFirstWordMs = null;
    tier.accuracy = null;
    tier.diff = [];
    tier.recorded = false;
    this.firstSoundCaptured = false;

    try {
      this.recognition = this.webSpeech.createRecognizer({
        quality: tier.value,
        continuous: true,
        interimResults: true
      });
    } catch (e: any) {
      this.errorMessage = e.message;
      return;
    }

    const r = this.recognition;
    this.activeTier = tier.value;
    this.isListening = true;

    r.onstart = () => this.ngZone.run(() => {
      tier.setupMs = Math.round(performance.now() - this.startCallTime);
    });

    const captureSoundStart = () => this.ngZone.run(() => {
      if (!this.firstSoundCaptured) {
        this.soundStartTime = performance.now();
        this.firstSoundCaptured = true;
      }
    });
    r.onsoundstart = captureSoundStart;
    r.onspeechstart = captureSoundStart;

    r.onresult = (event: any) => this.ngZone.run(() => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + ' ';
        else interim += transcript;
      }
      tier.transcript = finalText.trim();
      tier.interim = interim;

      if (tier.soundToFirstWordMs === null && this.firstSoundCaptured && (finalText || interim)) {
        tier.soundToFirstWordMs = Math.round(performance.now() - this.soundStartTime);
      }
    });

    r.onerror = (event: any) => this.ngZone.run(() => {
      this.errorMessage = event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow the mic to run the lab.'
        : `Recognition error: ${event.error}`;
    });

    r.onend = () => this.ngZone.run(() => {
      this.activeTier = null;
      this.isListening = false;
      this.recognition = null;
      if (tier.transcript) {
        this.scoreTier(tier);
        tier.recorded = true;
      }
    });

    this.startCallTime = performance.now();
    r.start();
  }

  stop() {
    this.stopRecognition();
  }

  onReferenceChanged() {
    // Re-score every recorded attempt against the new reference.
    this.tiers.filter(t => t.recorded).forEach(t => this.scoreTier(t));
  }

  private scoreTier(tier: TierState) {
    const ref = this.tokenizeWords(this.referenceText);
    const hyp = this.tokenizeWords(tier.transcript);
    const { tokens, substitutions, insertions, deletions } = this.diffWords(ref, hyp);
    tier.diff = tokens;
    tier.substitutions = substitutions;
    tier.insertions = insertions;
    tier.deletions = deletions;
    const wer = ref.length > 0 ? (substitutions + insertions + deletions) / ref.length : 0;
    tier.accuracy = Math.max(0, Math.round((1 - wer) * 100));
  }

  private tokenizeWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]/gu, '')
      .split(/\s+/)
      .filter(Boolean);
  }

  /** Word-level alignment via edit distance, backtraced into per-token diff ops. */
  private diffWords(ref: string[], hyp: string[]): { tokens: DiffToken[]; substitutions: number; insertions: number; deletions: number } {
    const n = ref.length, m = hyp.length;
    const d: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) d[i][0] = i;
    for (let j = 0; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const substitution = d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
        d[i][j] = Math.min(substitution, d[i - 1][j] + 1, d[i][j - 1] + 1);
      }
    }

    const tokens: DiffToken[] = [];
    let i = n, j = m, substitutions = 0, insertions = 0, deletions = 0;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] && ref[i - 1] === hyp[j - 1]) {
        tokens.unshift({ text: hyp[j - 1], kind: 'match' });
        i--; j--;
      } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
        tokens.unshift({ text: hyp[j - 1], kind: 'sub' });
        substitutions++; i--; j--;
      } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
        tokens.unshift({ text: hyp[j - 1], kind: 'ins' });
        insertions++; j--;
      } else {
        tokens.unshift({ text: ref[i - 1], kind: 'del' });
        deletions++; i--;
      }
    }
    return { tokens, substitutions, insertions, deletions };
  }

  diffTokenClass(kind: DiffToken['kind']): string {
    switch (kind) {
      case 'sub': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded px-0.5';
      case 'ins': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-0.5';
      case 'del': return 'text-slate-400 dark:text-slate-500 line-through';
      default: return '';
    }
  }

  get bestTier(): TierState | null {
    const recorded = this.tiers.filter(t => t.recorded && t.accuracy !== null);
    if (recorded.length < 2) return null;
    return recorded.reduce((best, t) => (t.accuracy! > best.accuracy! ? t : best));
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
