import { Component, Inject, NgZone, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const Writer: any;

interface StoryWord {
  text: string;
  start: number;
}

@Component({
  selector: 'app-story-time-demo',
  templateUrl: './story-time-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class StoryTimeDemoComponent extends BasePage implements OnInit, OnDestroy {
  demo = DEMOS_DATA.find(d => d.id === 'story-time')!;

  ingredients: string[] = ['a dragon', 'a submarine', 'pancakes'];
  ingredientSets: string[][] = [
    ['a dragon', 'a submarine', 'pancakes'],
    ['a shy robot', 'a lighthouse', 'a birthday cake'],
    ['a penguin', 'a hot air balloon', 'a treasure map']
  ];

  writerStatus = 'loading...';
  synthesisSupported = false;
  errorMessage = '';

  story = '';
  storyWords: StoryWord[] = [];
  currentWordIndex = -1;
  boundaryEventsSeen = false;

  isWriting = false;
  isSpeaking = false;
  isPaused = false;
  rate = 0.95;

  ttft: number | null = null;
  totalTime: number | null = null;

  private abortController: AbortController | null = null;
  private currentUtterance: any = null;

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private readonly ngZone: NgZone
  ) {
    super(document, title);
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    this.synthesisSupported = 'speechSynthesis' in window;
    try {
      this.writerStatus = 'Writer' in self ? await Writer.availability() : 'unavailable';
    } catch {
      this.writerStatus = 'unavailable';
    }
  }

  override ngOnDestroy() {
    this.stopNarration();
    this.abortController?.abort();
    super.ngOnDestroy();
  }

  get statusPills() {
    return [
      { name: 'Writer', status: this.writerStatus },
      { name: 'Speech Synthesis', status: this.synthesisSupported ? 'available' : 'unavailable' }
    ];
  }

  useIngredients(set: string[]) {
    this.ingredients = [...set];
  }

  trackByIndex(index: number): number {
    return index;
  }

  private get cleanedIngredients(): string[] {
    return this.ingredients.map(i => i.trim()).filter(i => i.length > 0);
  }

  async writeStory() {
    const ingredients = this.cleanedIngredients;
    if (ingredients.length === 0 || this.isWriting || this.writerStatus === 'unavailable') return;

    this.stopNarration();
    this.isWriting = true;
    this.errorMessage = '';
    this.story = '';
    this.storyWords = [];
    this.currentWordIndex = -1;
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      const writer = await Writer.create({
        tone: 'casual',
        format: 'plain-text',
        length: 'medium',
        sharedContext: 'You write warm, gentle bedtime stories for children aged four to eight. Simple words, short sentences, a happy ending, around 200 words.'
      });

      const stream = writer.writeStreaming(
        `Write a bedtime story featuring ${ingredients.join(', ')}.`,
        { signal: this.abortController.signal }
      );

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.story += chunk;
      }
      this.totalTime = Math.round(performance.now() - startTime);
      writer.destroy?.();

      this.storyWords = this.splitIntoWords(this.story);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Could not write the story.';
      }
    } finally {
      this.isWriting = false;
      this.abortController = null;
    }
  }

  /** Splits the story into words while remembering each word's character offset. */
  private splitIntoWords(text: string): StoryWord[] {
    const words: StoryWord[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      words.push({ text: match[0], start: match.index });
    }
    return words;
  }

  narrate() {
    if (!this.story || !this.synthesisSupported || this.isSpeaking) return;

    const synth = (window as any).speechSynthesis;
    synth.cancel();

    const utterance = new (window as any).SpeechSynthesisUtterance(this.story);
    utterance.rate = this.rate;
    utterance.pitch = 1.05;

    utterance.onstart = () => this.ngZone.run(() => {
      this.isSpeaking = true;
      this.isPaused = false;
    });

    // Boundary events drive the karaoke highlight: charIndex → word index.
    utterance.onboundary = (event: any) => this.ngZone.run(() => {
      this.boundaryEventsSeen = true;
      const index = this.storyWords.findIndex(
        (word, i) => event.charIndex >= word.start &&
          (i === this.storyWords.length - 1 || event.charIndex < this.storyWords[i + 1].start)
      );
      if (index >= 0) this.currentWordIndex = index;
    });

    const finish = () => this.ngZone.run(() => {
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentWordIndex = -1;
    });
    utterance.onend = finish;
    utterance.onerror = finish;

    this.currentUtterance = utterance;
    synth.speak(utterance);
  }

  pauseNarration() {
    (window as any).speechSynthesis?.pause();
    this.isPaused = true;
  }

  resumeNarration() {
    (window as any).speechSynthesis?.resume();
    this.isPaused = false;
  }

  stopNarration() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      (window as any).speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentWordIndex = -1;
  }

  get dynamicCodeSnippet(): string {
    const ingredients = this.cleanedIngredients.join(', ') || 'a dragon, a submarine, pancakes';
    return `// 1. Write the story on-device
const writer = await Writer.create({
  tone: "casual",
  format: "plain-text",
  length: "medium",
  sharedContext: "You write warm bedtime stories for young children."
});

const stream = writer.writeStreaming(
  "Write a bedtime story featuring ${ingredients}."
);
for await (const chunk of stream) story += chunk;

// 2. Narrate it with word-by-word karaoke highlighting
const utterance = new SpeechSynthesisUtterance(story);
utterance.rate = ${this.rate};

utterance.onboundary = (event) => {
  // charIndex points into the utterance text at the word being spoken
  highlightWordAt(event.charIndex);
};

speechSynthesis.speak(utterance);
// speechSynthesis.pause() / .resume() / .cancel()`;
  }
}
