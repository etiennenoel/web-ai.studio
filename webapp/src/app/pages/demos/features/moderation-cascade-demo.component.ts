import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageModel: any;

type Verdict = 'benign' | 'toxic' | 'spam';

interface ModeratedComment {
  id: number;
  author: string;
  text: string;
  verdict: Verdict | null;
  resolvedBy: 'embeddings' | 'llm' | null;
  margin: number | null;
  reason: string | null;
  timeMs: number | null;
  isProcessing: boolean;
}

const VERDICT_EXEMPLARS: Record<Verdict, string[]> = {
  benign: [
    'This tutorial saved my weekend, thank you so much!',
    'Great write-up, I bookmarked it for later.',
    'Could you do a follow-up post about performance?',
    'I disagree with the methodology, but the data is useful.'
  ],
  toxic: [
    'You are an idiot and everyone here knows it.',
    'Only a complete moron would ship this garbage.',
    'Nobody wants you here, just leave the forum.',
    'Shut up, you have no idea what you are talking about.'
  ],
  spam: [
    'BUY CHEAP WATCHES at best-deals-watch dot com',
    'Make $5000 a week from home, DM me now!!!',
    'FREE followers and likes at insta-boost dot net',
    'Click here to claim your prize before it expires!!!'
  ]
};

const COMMENTS: { author: string; text: string }[] = [
  { author: 'maya_dev', text: 'This tutorial saved my weekend, thank you!' },
  { author: 'watch4less', text: 'BUY CHEAP WATCHES >>> best-deals-watch dot com' },
  { author: 'grumpy_gus', text: 'You\'re an idiot and everyone here knows it.' },
  { author: 'sam_r', text: 'Great write-up, bookmarked for later reference.' },
  { author: 'crypto_carl', text: 'Make $5000/week from home, DM me now!!!' },
  { author: 'jjones', text: 'Could you do a follow-up on WebGPU support?' },
  { author: 'anon4432', text: 'Only a complete moron would ship this garbage.' },
  { author: 'lena_k', text: 'The dark mode on this site is gorgeous.' },
  { author: 'insta_boost', text: '🔥🔥 FREE followers at insta-boost dot net 🔥🔥' },
  { author: 'dr_stats', text: 'I disagree with the benchmark methodology, but the data itself is useful.' },
  { author: 'sarcasmo', text: 'Wow, genius idea. Really groundbreaking stuff. Slow clap.' },
  { author: 'self_promo_sue', text: 'I wrote a longer rebuttal on my blog if anyone is interested.' },
  { author: 'quiet_quinn', text: 'First time commenting — this community seems really helpful.' }
];

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['benign', 'toxic', 'spam'] },
    reason: { type: 'string' }
  },
  required: ['verdict', 'reason'],
  additionalProperties: false
};

@Component({
  selector: 'app-moderation-cascade-demo',
  templateUrl: './moderation-cascade-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ModerationCascadeDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'moderation-cascade')!;

  comments: ModeratedComment[] = COMMENTS.map((c, i) => ({
    id: i + 1,
    ...c,
    verdict: null,
    resolvedBy: null,
    margin: null,
    reason: null,
    timeMs: null,
    isProcessing: false
  }));

  marginThreshold = 0.05;
  newComment = '';

  isProcessing = false;
  processed = false;

  embeddingResolved = 0;
  llmResolved = 0;
  totalEmbeddingMs = 0;
  totalLlmMs = 0;

  private centroids: Record<Verdict, Float32Array> | null = null;
  private judgeSession: any = null;
  private nextId = COMMENTS.length + 1;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    await this.checkAvailability();
  }

  get statusPills() {
    return [
      { name: 'Semantic Embedder', status: this.embedderStatus },
      { name: 'Prompt API (judge)', status: this.languageModelAvailability }
    ];
  }

  get resolvedPercentByEmbeddings(): number {
    const total = this.embeddingResolved + this.llmResolved;
    return total === 0 ? 0 : Math.round((this.embeddingResolved / total) * 100);
  }

  get averageEmbeddingMs(): number | null {
    return this.embeddingResolved > 0 ? Math.round(this.totalEmbeddingMs / this.embeddingResolved) : null;
  }

  get averageLlmMs(): number | null {
    return this.llmResolved > 0 ? Math.round(this.totalLlmMs / this.llmResolved) : null;
  }

  verdictChipClass(verdict: Verdict | null): string {
    switch (verdict) {
      case 'benign': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'toxic': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'spam': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      default: return 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400';
    }
  }

  private async prepareCentroids() {
    if (this.centroids) return;
    const verdicts = Object.keys(VERDICT_EXEMPLARS) as Verdict[];
    const allExemplars = verdicts.flatMap(v => VERDICT_EXEMPLARS[v]);
    const vectors = await this.semanticEmbedder.embed(allExemplars, 'classification', this.onDownloadProgress);
    const centroids = {} as Record<Verdict, Float32Array>;
    let cursor = 0;
    for (const verdict of verdicts) {
      const count = VERDICT_EXEMPLARS[verdict].length;
      centroids[verdict] = this.semanticEmbedder.meanVector(vectors.slice(cursor, cursor + count));
      cursor += count;
    }
    this.centroids = centroids;
  }

  async processAll() {
    if (this.isProcessing || this.embedderStatus === 'unavailable') return;

    this.isProcessing = true;
    this.errorMessage = '';
    this.embeddingResolved = 0;
    this.llmResolved = 0;
    this.totalEmbeddingMs = 0;
    this.totalLlmMs = 0;
    this.comments.forEach(c => {
      c.verdict = null;
      c.resolvedBy = null;
      c.margin = null;
      c.reason = null;
      c.timeMs = null;
    });

    try {
      await this.prepareCentroids();
      for (const comment of this.comments) {
        await this.moderate(comment);
      }
      this.processed = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Moderation failed.';
    } finally {
      this.isProcessing = false;
    }
  }

  private async moderate(comment: ModeratedComment) {
    comment.isProcessing = true;
    const start = performance.now();

    try {
      // Stage 1: embedding classifier — runs on every comment.
      const vector = await this.semanticEmbedder.embedOne(comment.text, 'classification');
      const scored = (Object.keys(this.centroids!) as Verdict[])
        .map(verdict => ({ verdict, score: this.semanticEmbedder.cosineSimilarity(vector, this.centroids![verdict]) }))
        .sort((a, b) => b.score - a.score);

      const margin = scored[0].score - scored[1].score;
      comment.margin = margin;
      const embeddingMs = performance.now() - start;

      if (margin >= this.marginThreshold || this.languageModelAvailability === 'unavailable') {
        comment.verdict = scored[0].verdict;
        comment.resolvedBy = 'embeddings';
        comment.timeMs = Math.round(embeddingMs);
        this.embeddingResolved++;
        this.totalEmbeddingMs += embeddingMs;
        return;
      }

      // Stage 2: the LLM judge — only for borderline comments.
      const llmStart = performance.now();
      if (!this.judgeSession) {
        this.judgeSession = await LanguageModel.create({
          systemPrompt: 'You moderate a technology forum. Classify comments as benign, toxic (insulting or hostile), or spam (unsolicited promotion or scams). Sarcasm and criticism of ideas are benign. Give a one-sentence reason.'
        });
      }
      const response = await this.judgeSession.prompt(
        `Comment: "${comment.text}"`,
        { responseConstraint: JUDGE_SCHEMA }
      );
      const result = JSON.parse(response);
      comment.verdict = result.verdict;
      comment.reason = result.reason;
      comment.resolvedBy = 'llm';
      comment.timeMs = Math.round(performance.now() - start);
      this.llmResolved++;
      this.totalLlmMs += performance.now() - llmStart;
    } catch (e: any) {
      comment.reason = e.message;
    } finally {
      comment.isProcessing = false;
    }
  }

  async submitComment() {
    const text = this.newComment.trim();
    if (!text || this.isProcessing || this.embedderStatus === 'unavailable') return;

    const comment: ModeratedComment = {
      id: this.nextId++,
      author: 'you',
      text,
      verdict: null,
      resolvedBy: null,
      margin: null,
      reason: null,
      timeMs: null,
      isProcessing: false
    };
    this.comments.push(comment);
    this.newComment = '';

    try {
      await this.prepareCentroids();
      await this.moderate(comment);
    } catch (e: any) {
      this.errorMessage = e.message || 'Could not moderate the comment.';
    }
  }

  override ngOnDestroy() {
    this.judgeSession?.destroy?.();
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
