import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseSpeechDemoComponent } from '../components/base-demo/base-speech-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

interface BiasPhrase {
  phrase: string;
  boost: number;
}

interface TranscriptSegment {
  text: string;
  hit: boolean;
}

type BiasMode = 'without' | 'with';

@Component({
  selector: 'app-contextual-biasing-demo',
  templateUrl: './contextual-biasing-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ContextualBiasingDemoComponent extends BaseSpeechDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'contextual-biasing')!;

  phrases: BiasPhrase[] = [
    { phrase: 'TinyGemma', boost: 3.0 },
    { phrase: 'WebNN', boost: 3.0 },
    { phrase: 'Gemma Nano', boost: 2.0 },
    { phrase: 'Axon', boost: 2.0 },
    { phrase: 'Chrome Canary', boost: 2.0 }
  ];

  suggestedSentence = 'Add TinyGemma and WebNN benchmarks to the Axon suite in Chrome Canary.';

  readonly modes: BiasMode[] = ['without', 'with'];
  transcripts: Record<BiasMode, string> = { without: '', with: '' };
  interim = '';
  activeMode: BiasMode | null = null;
  biasingSupported = false;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkSpeechAvailability({ quality: 'dictation' });
    this.biasingSupported = this.webSpeech.supportsContextualBiasing();
  }

  addPhrase() {
    this.phrases.push({ phrase: '', boost: 2.0 });
  }

  removePhrase(index: number) {
    if (this.phrases.length > 1) this.phrases.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  get validPhrases(): BiasPhrase[] {
    return this.phrases.filter(p => p.phrase.trim().length > 0);
  }

  record(mode: BiasMode) {
    if (this.activeMode || this.speechStatus !== 'available') return;

    this.errorMessage = '';
    this.transcripts[mode] = '';
    this.interim = '';

    try {
      this.recognition = this.webSpeech.createRecognizer({
        quality: 'dictation',
        continuous: false,
        interimResults: true,
        phrases: mode === 'with' ? this.validPhrases : undefined
      });
    } catch (e: any) {
      this.errorMessage = e.message;
      return;
    }

    const r = this.recognition;
    this.activeMode = mode;
    this.isListening = true;

    r.onresult = (event: any) => this.ngZone.run(() => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + ' ';
        else interim += transcript;
      }
      this.transcripts[mode] = finalText.trim();
      this.interim = interim;
    });

    r.onerror = (event: any) => this.ngZone.run(() => {
      this.errorMessage = event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow the mic to record.'
        : `Recognition error: ${event.error}`;
    });

    r.onend = () => this.ngZone.run(() => {
      this.activeMode = null;
      this.isListening = false;
      this.interim = '';
      this.recognition = null;
    });

    r.start();
  }

  stop() {
    this.stopRecognition();
  }

  termFound(mode: BiasMode, phrase: string): boolean {
    return this.transcripts[mode].toLowerCase().includes(phrase.trim().toLowerCase());
  }

  /** Splits a transcript into segments so boosted terms can be highlighted inline. */
  highlight(mode: BiasMode): TranscriptSegment[] {
    const transcript = this.transcripts[mode];
    if (!transcript) return [];
    const terms = this.validPhrases.map(p => p.phrase.trim()).filter(Boolean);
    if (terms.length === 0) return [{ text: transcript, hit: false }];

    const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const parts = transcript.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
    const lowered = new Set(terms.map(t => t.toLowerCase()));
    return parts.filter(p => p.length > 0).map(part => ({ text: part, hit: lowered.has(part.toLowerCase()) }));
  }

  hitCount(mode: BiasMode): number {
    return this.validPhrases.filter(p => this.termFound(mode, p.phrase)).length;
  }

  get bothRecorded(): boolean {
    return !!this.transcripts.without && !!this.transcripts.with;
  }

  get dynamicCodeSnippet(): string {
    const phraseLines = this.validPhrases
      .map(p => `recognition.phrases.push(new SpeechRecognitionPhrase(${JSON.stringify(p.phrase)}, ${p.boost.toFixed(1)}));`)
      .join('\n');
    return `const options = { langs: ["en-US"], processLocally: true, quality: "dictation" };

const recognition = new SpeechRecognition();
recognition.options = options;
recognition.interimResults = true;

// Contextual biasing (explainer: contextual-biasing):
// boost domain terms the base model would otherwise mangle
${phraseLines}

recognition.onresult = (event) => {
  // Try saying: "${this.suggestedSentence}"
  console.log(event.results[0][0].transcript);
};

recognition.start();`;
  }
}
