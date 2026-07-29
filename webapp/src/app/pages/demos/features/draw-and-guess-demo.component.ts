import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageModel: any;

interface GuessEntry {
  text: string;
  correct: boolean;
  timeMs: number;
}

const WORDS = [
  'cat', 'house', 'tree', 'bicycle', 'sun', 'fish', 'car', 'clock',
  'star', 'boat', 'flower', 'cup', 'chair', 'umbrella', 'snowman',
  'rocket', 'glasses', 'pizza', 'butterfly', 'ladder'
];

@Component({
  selector: 'app-draw-and-guess-demo',
  templateUrl: './draw-and-guess-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class DrawAndGuessDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'draw-and-guess')!;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  word = '';
  guesses: GuessEntry[] = [];
  won = false;
  wins = 0;
  rounds = 0;
  strokeCount = 0;
  hasDrawing = false;

  isGuessing = false;
  guessOnStroke = true;
  errorMessage = '';

  private drawing = false;
  private guessTimer: any = null;
  private guessToken = 0;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkAvailability([{ type: 'image' }]);
    this.newRound();
  }

  get statusPills() {
    return [{ name: 'Prompt API (image)', status: this.languageModelAvailability }];
  }

  get latestGuess(): GuessEntry | null {
    return this.guesses[0] ?? null;
  }

  newRound() {
    let next = this.word;
    while (next === this.word) {
      next = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    this.word = next;
    this.won = false;
    this.guesses = [];
    this.strokeCount = 0;
    this.rounds++;
    this.clearCanvas();
  }

  clearCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.hasDrawing = false;
  }

  private canvasPoint(event: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  onPointerDown(event: PointerEvent) {
    if (this.won) return;
    event.preventDefault();
    const canvas = this.canvasRef.nativeElement;
    canvas.setPointerCapture(event.pointerId);
    this.drawing = true;
    // A fresh canvas needs its white background before the first stroke.
    if (!this.hasDrawing) this.clearCanvas();
    const ctx = canvas.getContext('2d')!;
    const point = this.canvasPoint(event);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    this.hasDrawing = true;
  }

  onPointerMove(event: PointerEvent) {
    if (!this.drawing) return;
    event.preventDefault();
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const point = this.canvasPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  onPointerUp(event: PointerEvent) {
    if (!this.drawing) return;
    event.preventDefault();
    this.drawing = false;
    this.strokeCount++;

    if (this.guessOnStroke && !this.won) {
      clearTimeout(this.guessTimer);
      this.guessTimer = setTimeout(() => this.guess(), 800);
    }
  }

  async guess() {
    if (this.isGuessing || this.won || !this.hasDrawing) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    const token = ++this.guessToken;
    this.isGuessing = true;
    this.errorMessage = '';
    const start = performance.now();

    try {
      const bitmap = await createImageBitmap(this.canvasRef.nativeElement);
      const session = await LanguageModel.create({
        expectedInputs: [{ type: 'image' }],
        systemPrompt: 'You are playing a drawing guessing game. The image is a simple hand-drawn black-on-white doodle. Reply with ONLY your single best guess for what it shows, in one to three lowercase words. No punctuation, no explanations.'
      });

      const raw = await session.prompt([{
        role: 'user',
        content: [
          { type: 'text', value: 'What is this simple line drawing?' },
          { type: 'image', value: bitmap }
        ]
      }]);
      session.destroy?.();

      if (token !== this.guessToken) return; // a newer guess superseded this one

      const text = raw.trim().toLowerCase().replace(/[.!?"']/g, '').split('\n')[0];
      const correct = text.includes(this.word);
      this.guesses.unshift({ text, correct, timeMs: Math.round(performance.now() - start) });
      if (this.guesses.length > 8) this.guesses.pop();

      if (correct) {
        this.won = true;
        this.wins++;
        clearTimeout(this.guessTimer);
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'The model could not make a guess.';
    } finally {
      if (token === this.guessToken) this.isGuessing = false;
    }
  }

  override ngOnDestroy() {
    clearTimeout(this.guessTimer);
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    return `const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }],
  systemPrompt: "You are playing a drawing guessing game. " +
    "Reply with ONLY your best guess for the doodle, in 1-3 lowercase words."
});

// After each stroke, let the model take a guess
canvas.addEventListener("pointerup", async () => {
  const bitmap = await createImageBitmap(canvas);

  const guess = await session.prompt([{
    role: "user",
    content: [
      { type: "text", value: "What is this simple line drawing?" },
      { type: "image", value: bitmap }
    ]
  }]);

  // Current word: "${this.word || 'cat'}" — ${this.guesses.length} guesses so far this round
  if (guess.toLowerCase().includes(secretWord)) {
    celebrate("Guessed in ${this.strokeCount || 'N'} strokes!");
  }
});`;
  }
}
