import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

interface CacheEntry {
  question: string;
  answer: string;
  vector: Float32Array;
  generationTimeMs: number;
  lastScore: number | null;
  expanded: boolean;
}

interface AskOutcome {
  type: 'hit' | 'miss';
  timeMs: number;
  matchedQuestion?: string;
  score?: number;
  tokensSaved?: number;
}

@Component({
  selector: 'app-semantic-cache-demo',
  templateUrl: './semantic-cache-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SemanticCacheDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'semantic-cache')!;

  question = '';
  answer = '';
  threshold = 0.85;

  cache: CacheEntry[] = [];
  lastOutcome: AskOutcome | null = null;

  hits = 0;
  misses = 0;
  totalGenerationMs = 0;
  totalHitMs = 0;
  tokensSaved = 0;

  /** Pairs: ask the first, then its paraphrase to land a cache hit. */
  samplePairs: { first: string; paraphrase: string }[] = [
    { first: 'What is the capital of France?', paraphrase: 'Which city is the capital of France?' },
    { first: 'Why is the sky blue?', paraphrase: 'What makes the sky look blue?' },
    { first: 'How does photosynthesis work?', paraphrase: 'How do plants make their own food?' }
  ];

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    await this.checkAvailability();
  }

  get canAsk(): boolean {
    return this.state !== PromptInputStateEnum.Inferencing
      && this.embedderUsable
      && this.languageModelAvailability !== 'unavailable';
  }

  get averageGenerationMs(): number | null {
    return this.misses > 0 ? Math.round(this.totalGenerationMs / this.misses) : null;
  }

  get averageHitMs(): number | null {
    return this.hits > 0 ? Math.round(this.totalHitMs / this.hits) : null;
  }

  useSample(text: string) {
    this.question = text;
    this.ask();
  }

  clearCache() {
    this.cache = [];
    this.lastOutcome = null;
    this.answer = '';
    this.hits = 0;
    this.misses = 0;
    this.totalGenerationMs = 0;
    this.totalHitMs = 0;
    this.tokensSaved = 0;
  }

  async ask() {
    const q = this.question.trim();
    if (!q || !this.canAsk) return;

    this.state = PromptInputStateEnum.Inferencing;
    this.answer = '';
    this.errorMessage = '';
    this.lastOutcome = null;
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      // 1. Embed the question and look for a semantically equivalent cached one
      const queryVector = await this.semanticEmbedder.embedOne(q, 'similarity');

      let best: { entry: CacheEntry; score: number } | null = null;
      for (const entry of this.cache) {
        const score = this.semanticEmbedder.cosineSimilarity(queryVector, entry.vector);
        entry.lastScore = score;
        if (!best || score > best.score) best = { entry, score };
      }

      if (best && best.score >= this.threshold) {
        // 2a. Cache HIT — serve the stored answer instantly, no LLM call
        const timeMs = Math.round(performance.now() - startTime);
        this.answer = best.entry.answer;
        const saved = Math.max(0, Math.round(best.entry.answer.length / 4));
        this.lastOutcome = {
          type: 'hit',
          timeMs,
          matchedQuestion: best.entry.question,
          score: best.score,
          tokensSaved: saved
        };
        this.hits++;
        this.totalHitMs += timeMs;
        this.tokensSaved += saved;
        this.ttft = timeMs;
        this.totalTime = timeMs;
      } else {
        // 2b. Cache MISS — generate with the Prompt API and store the result
        const session = await LanguageModel.create({
          systemPrompt: 'Answer the question accurately in 2 to 3 concise sentences.'
        });
        const stream = session.promptStreaming(q, { signal: this.abortController.signal });
        for await (const chunk of stream) {
          if (!firstTokenTime) {
            firstTokenTime = performance.now();
            this.ttft = Math.round(firstTokenTime - startTime);
          }
          this.answer += chunk;
        }
        session.destroy?.();

        const timeMs = Math.round(performance.now() - startTime);
        this.totalTime = timeMs;
        this.lastOutcome = { type: 'miss', timeMs };
        this.misses++;
        this.totalGenerationMs += timeMs;
        this.cache.unshift({
          question: q,
          answer: this.answer,
          vector: queryVector,
          generationTimeMs: timeMs,
          lastScore: null,
          expanded: false
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Something went wrong while answering.';
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  get dynamicCodeSnippet(): string {
    const q = this.question.trim() || 'Which city is the capital of France?';
    return `const embedder = await SemanticEmbedder.create({ taskType: "similarity" });
const cache = []; // { vector, question, answer }

async function ask(question) {
  const { embeddings: [q] } = await embedder.embed(question);

  // Cache hit: a semantically equivalent question was already answered
  const best = cache
    .map(entry => ({ entry, score: cosineSimilarity(q.values, entry.vector) }))
    .sort((a, b) => b.score - a.score)[0];

  if (best && best.score >= ${this.threshold.toFixed(2)}) {
    return best.entry.answer; // instant — no LLM call, no tokens
  }

  // Cache miss: generate with the on-device LLM, then store for next time
  const session = await LanguageModel.create();
  const answer = await session.prompt(question);
  cache.push({ vector: q.values, question, answer });
  return answer;
}

await ask("What is the capital of France?");   // miss → generates
await ask(${JSON.stringify(q)}); // hit → instant`;
  }
}
