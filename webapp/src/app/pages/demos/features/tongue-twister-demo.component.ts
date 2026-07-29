import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseSpeechDemoComponent } from '../components/base-demo/base-speech-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { diffWords, tokenizeWords, WordDiffToken } from '../../../core/utils/word-diff.util';

interface Attempt {
  transcript: string;
  accuracy: number;
  diff: WordDiffToken[];
  durationMs: number;
  rank: Rank;
}

interface Rank {
  label: string;
  emoji: string;
  textClass: string;
}

const TWISTERS = [
  'She sells seashells by the seashore.',
  'Peter Piper picked a peck of pickled peppers.',
  'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
  'Red lorry, yellow lorry, red lorry, yellow lorry.',
  'The sixth sick sheikh\'s sixth sheep is sick.',
  'Unique New York, unique New York, you know you need unique New York.'
];

@Component({
  selector: 'app-tongue-twister-demo',
  templateUrl: './tongue-twister-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class TongueTwisterDemoComponent extends BaseSpeechDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'tongue-twister')!;

  twisters = TWISTERS;
  twister = TWISTERS[0];

  attempts: Attempt[] = [];
  interim = '';
  liveTranscript = '';
  bestAccuracy: number | null = null;

  private recordingStart = 0;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkSpeechAvailability({ quality: 'dictation' });
  }

  selectTwister(twister: string) {
    if (this.isListening) return;
    this.twister = twister;
    this.attempts = [];
    this.bestAccuracy = null;
  }

  rankFor(accuracy: number): Rank {
    if (accuracy >= 95) return { label: 'Tongue Master', emoji: '🏆', textClass: 'text-amber-500' };
    if (accuracy >= 85) return { label: 'Silver Tongue', emoji: '🥈', textClass: 'text-slate-400' };
    if (accuracy >= 70) return { label: 'Getting There', emoji: '💪', textClass: 'text-sky-500' };
    return { label: 'Tongue Tied', emoji: '🙃', textClass: 'text-rose-500' };
  }

  record() {
    if (this.isListening || this.speechStatus !== 'available') return;

    this.errorMessage = '';
    this.liveTranscript = '';
    this.interim = '';

    try {
      this.recognition = this.webSpeech.createRecognizer({
        quality: 'dictation',
        continuous: false,
        interimResults: true
      });
    } catch (e: any) {
      this.errorMessage = e.message;
      return;
    }

    const r = this.recognition;
    this.isListening = true;
    this.recordingStart = performance.now();

    r.onresult = (event: any) => this.ngZone.run(() => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + ' ';
        else interim += transcript;
      }
      this.liveTranscript = finalText.trim();
      this.interim = interim;
    });

    r.onerror = (event: any) => this.ngZone.run(() => {
      this.errorMessage = event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow the mic to play.'
        : event.error === 'no-speech'
          ? 'No speech detected — try again, and faster!'
          : `Recognition error: ${event.error}`;
    });

    r.onend = () => this.ngZone.run(() => {
      this.isListening = false;
      this.interim = '';
      this.recognition = null;
      if (this.liveTranscript) this.scoreAttempt();
    });

    r.start();
  }

  stop() {
    this.stopRecognition();
  }

  private scoreAttempt() {
    const reference = tokenizeWords(this.twister);
    const hypothesis = tokenizeWords(this.liveTranscript);
    const result = diffWords(reference, hypothesis);
    const accuracy = Math.max(0, Math.round((1 - result.wer) * 100));

    const attempt: Attempt = {
      transcript: this.liveTranscript,
      accuracy,
      diff: result.tokens,
      durationMs: Math.round(performance.now() - this.recordingStart),
      rank: this.rankFor(accuracy)
    };
    this.attempts.unshift(attempt);
    if (this.attempts.length > 6) this.attempts.pop();
    this.bestAccuracy = Math.max(this.bestAccuracy ?? 0, accuracy);
    this.liveTranscript = '';
  }

  diffTokenClass(kind: WordDiffToken['kind']): string {
    switch (kind) {
      case 'sub': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded px-0.5';
      case 'ins': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-0.5';
      case 'del': return 'text-slate-400 dark:text-slate-500 line-through';
      default: return '';
    }
  }

  get dynamicCodeSnippet(): string {
    return `const twister = ${JSON.stringify(this.twister)};

const recognition = new SpeechRecognition();
recognition.options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = [...event.results].map(r => r[0].transcript).join("");

  // Score with word error rate against the target sentence
  const accuracy = 1 - wordErrorRate(twister, transcript);

  if (accuracy >= 0.95) rank = "🏆 Tongue Master";
  else if (accuracy >= 0.85) rank = "🥈 Silver Tongue";
  else if (accuracy >= 0.70) rank = "💪 Getting There";
  else rank = "🙃 Tongue Tied";
};

recognition.start(); // now say it FAST
${this.bestAccuracy !== null ? `\n// Your best so far: ${this.bestAccuracy}%` : ''}`;
  }
}
