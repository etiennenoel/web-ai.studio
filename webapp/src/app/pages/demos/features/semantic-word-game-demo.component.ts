import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

interface Guess {
  word: string;
  score: number;
  isLatest: boolean;
}

interface Temperature {
  label: string;
  icon: string;
  textClass: string;
  barClass: string;
}

const SECRET_WORDS: string[] = [
  'volcano', 'penguin', 'library', 'thunderstorm', 'spaceship', 'chocolate',
  'orchestra', 'glacier', 'butterfly', 'submarine', 'harvest', 'midnight',
  'carnival', 'telescope', 'avalanche', 'honey', 'marathon', 'lighthouse',
  'jungle', 'blizzard', 'campfire', 'pyramid', 'waterfall', 'magnet',
  'compass', 'lantern', 'meadow', 'tornado', 'castle', 'desert',
  'island', 'forest', 'bridge', 'mirror', 'anchor', 'comet'
];

@Component({
  selector: 'app-semantic-word-game-demo',
  templateUrl: './semantic-word-game-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SemanticWordGameDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'semantic-word-game')!;

  secretWord = '';
  private secretVector: Float32Array | null = null;

  guessInput = '';
  guesses: Guess[] = [];
  guessCount = 0;
  won = false;
  gaveUp = false;
  isGuessing = false;
  isPreparing = false;
  gameReady = false;
  inputError = '';
  guessLatencyMs: number | null = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    if (this.embedderStatus === 'available') {
      await this.newGame();
    }
  }

  get isOver(): boolean {
    return this.won || this.gaveUp;
  }

  get bestGuess(): Guess | null {
    return this.guesses[0] ?? null;
  }

  get sortedGuesses(): Guess[] {
    return this.guesses;
  }

  async newGame() {
    this.isPreparing = true;
    this.errorMessage = '';
    try {
      let word = this.secretWord;
      while (word === this.secretWord) {
        word = SECRET_WORDS[Math.floor(Math.random() * SECRET_WORDS.length)];
      }
      this.secretWord = word;
      this.secretVector = await this.semanticEmbedder.embedOne(word, 'similarity');
      this.guesses = [];
      this.guessCount = 0;
      this.won = false;
      this.gaveUp = false;
      this.guessInput = '';
      this.inputError = '';
      this.guessLatencyMs = null;
      this.gameReady = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to start a new round.';
    } finally {
      this.isPreparing = false;
    }
  }

  giveUp() {
    if (!this.gameReady || this.isOver) return;
    this.gaveUp = true;
  }

  private normalizeWord(word: string): string {
    const lower = word.trim().toLowerCase();
    return lower.endsWith('s') && lower.length > 3 ? lower.slice(0, -1) : lower;
  }

  async submitGuess() {
    const raw = this.guessInput.trim().toLowerCase();
    this.inputError = '';

    if (!raw || !this.gameReady || this.isOver || this.isGuessing) return;
    if (!/^[a-z][a-z'-]*$/.test(raw)) {
      this.inputError = 'Single words only — letters, hyphens, and apostrophes.';
      return;
    }
    if (this.guesses.some(g => g.word === raw)) {
      this.inputError = `You already guessed "${raw}".`;
      return;
    }

    this.isGuessing = true;
    try {
      const start = performance.now();
      const guessVector = await this.semanticEmbedder.embedOne(raw, 'similarity');
      this.guessLatencyMs = Math.round(performance.now() - start);

      const score = this.semanticEmbedder.cosineSimilarity(this.secretVector!, guessVector);
      this.guessCount++;
      this.guesses.forEach(g => (g.isLatest = false));
      this.guesses.push({ word: raw, score, isLatest: true });
      this.guesses.sort((a, b) => b.score - a.score);
      this.guessInput = '';

      if (this.normalizeWord(raw) === this.normalizeWord(this.secretWord)) {
        this.won = true;
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to score the guess.';
    } finally {
      this.isGuessing = false;
    }
  }

  temperature(score: number): Temperature {
    if (score >= 0.9) return { label: 'Scorching', icon: 'bi-fire', textClass: 'text-red-600 dark:text-red-400', barClass: 'bg-red-500' };
    if (score >= 0.8) return { label: 'Hot', icon: 'bi-thermometer-high', textClass: 'text-orange-600 dark:text-orange-400', barClass: 'bg-orange-500' };
    if (score >= 0.7) return { label: 'Warm', icon: 'bi-thermometer-half', textClass: 'text-amber-600 dark:text-amber-400', barClass: 'bg-amber-500' };
    if (score >= 0.55) return { label: 'Cool', icon: 'bi-thermometer-low', textClass: 'text-sky-600 dark:text-sky-400', barClass: 'bg-sky-500' };
    return { label: 'Freezing', icon: 'bi-snow', textClass: 'text-blue-600 dark:text-blue-400', barClass: 'bg-blue-500' };
  }

  /** Maps a cosine score to a bar width that spreads the useful range visually. */
  barWidth(score: number): number {
    return Math.max(4, Math.min(100, ((score - 0.3) / 0.7) * 100));
  }

  get dynamicCodeSnippet(): string {
    return `const embedder = await SemanticEmbedder.create({ taskType: "similarity" });

// Pick and embed the secret word once
const secretWord = pickRandom(WORDS);
const { embeddings: [secret] } = await embedder.embed(secretWord);

async function guess(word) {
  // Every guess is embedded locally — instant, free, works offline
  const { embeddings: [g] } = await embedder.embed(word);
  const score = cosineSimilarity(secret.values, g.values);

  if (word.toLowerCase() === secretWord) return "🎉 You got it!";
  if (score >= 0.90) return "🔥 Scorching";
  if (score >= 0.80) return "Hot";
  if (score >= 0.70) return "Warm";
  if (score >= 0.55) return "Cool";
  return "🧊 Freezing";
}

// The whole game runs with zero network requests${this.guessCount > 0 ? `\n// You have made ${this.guessCount} ${this.guessCount === 1 ? 'guess' : 'guesses'} this round` : ''}`;
  }
}
