import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema } from '../../../core/services/classifier.service';

declare const LanguageModel: any;

type Verdict = 'benign' | 'toxic' | 'spam';

interface CascadeComment {
  id: number;
  author: string;
  text: string;
  verdict: Verdict | null;
  confidence: number | null;
  resolvedBy: 'classifier' | 'llm' | null;
  latencyMs: number | null;
  reason: string | null;
  isProcessing: boolean;
}

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
  selector: 'app-system1-system2-cascade-demo',
  standalone: false,
  host: { class: 'block h-full' },
  template: `
    <app-demo-layout
      [title]="demo.title"
      [description]="demo.description"
      [icon]="demo.icon"
      [category]="demo.category"
      [onDeviceReason]="demo.onDeviceReason"
      [codeSnippet]="demo.codeSnippet">
      <div demo-ui>

        <app-api-status
          [apis]="statusPills"
          [isDownloading]="isDownloading"
          [downloadProgress]="downloadProgress"
          unavailableHint="<span class='font-semibold'>The cascade needs the Classifier API.</span> Borderline comments escalate to the Prompt API when available.">
        </app-api-status>

        @if (errorMessage) {
          <div class="mb-4 bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>
        }

        <!-- Scoreboard -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-2xl p-4 border border-slate-200 dark:border-zinc-700 shadow-sm">
            <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Resolved by Classifier</div>
            <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ classifierResolved }}</div>
          </div>
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-2xl p-4 border border-slate-200 dark:border-zinc-700 shadow-sm">
            <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Escalated to LLM</div>
            <div class="text-2xl font-bold text-slate-700 dark:text-slate-300">{{ llmResolved }}</div>
          </div>
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-2xl p-4 border border-slate-200 dark:border-zinc-700 shadow-sm">
            <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Avg Classifier Time</div>
            <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ averageClassifierMs !== null ? averageClassifierMs + 'ms' : 'N/A' }}</div>
          </div>
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-2xl p-4 border border-slate-200 dark:border-zinc-700 shadow-sm">
            <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Avg LLM Judge Time</div>
            <div class="text-2xl font-bold text-slate-700 dark:text-slate-300">{{ averageLlmMs !== null ? averageLlmMs + 'ms' : 'N/A' }}</div>
          </div>
        </div>

        <!-- Controls -->
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5 mb-6 flex flex-wrap items-center gap-4">
          <button type="button"
                  (click)="processAll()"
                  [disabled]="isProcessing || classifierStatus === 'unavailable'"
                  class="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none">
            @if (isProcessing) {
              <i class="bi bi-arrow-repeat animate-spin"></i> Moderating...
            } @else {
              <i class="bi bi-funnel"></i> {{ processed ? 'Re-run Moderation' : 'Moderate the Queue' }}
            }
          </button>
          <div class="flex items-center gap-3 flex-grow max-w-sm">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Confidence gate</span>
            <input type="range" min="0.60" max="0.95" step="0.05" class="flex-grow accent-indigo-600"
                   [(ngModel)]="confidenceGate" [disabled]="isProcessing" />
            <span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 w-10">{{ (confidenceGate * 100).toFixed(0) }}%</span>
          </div>
          <span class="text-[11px] text-slate-400 dark:text-slate-500">Higher gate &rarr; more comments escalate to the Prompt API judge.</span>
        </div>

        <!-- Comment Queue -->
        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/50">
            <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <i class="bi bi-chat-square-text text-indigo-500"></i> Comment Queue — {{ comments.length }}
            </span>
          </div>

          <div class="divide-y divide-slate-100 dark:divide-zinc-800">
            @for (comment of comments; track comment.id) {
              <div class="px-5 py-3.5 flex items-start gap-3">
                <div class="flex-grow min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400">&#64;{{ comment.author }}</span>
                    @if (comment.verdict) {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                            [ngClass]="verdictChipClass(comment.verdict)">
                        {{ comment.verdict }}
                      </span>
                    }
                    @if (comment.resolvedBy === 'classifier') {
                      <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <i class="bi bi-lightning-charge-fill"></i> Classifier
                      </span>
                    } @else if (comment.resolvedBy === 'llm') {
                      <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                        <i class="bi bi-cpu"></i> LLM judge
                      </span>
                    }
                    <div class="flex-grow"></div>
                    @if (comment.latencyMs !== null) {
                      <span class="text-[9px] font-mono text-slate-400 dark:text-slate-500">{{ comment.latencyMs }}ms</span>
                    }
                    @if (comment.isProcessing) {
                      <i class="bi bi-arrow-repeat animate-spin text-indigo-400 text-xs"></i>
                    }
                  </div>
                  <p class="text-sm text-slate-700 dark:text-slate-300 m-0 mt-1 leading-relaxed">{{ comment.text }}</p>
                  @if (comment.reason) {
                    <p class="text-[11px] text-slate-400 dark:text-slate-500 m-0 mt-1 italic">Judge: {{ comment.reason }}</p>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Add your own -->
          <div class="p-4 border-t border-slate-100 dark:border-zinc-700/50 flex gap-3">
            <input type="text"
                   class="flex-grow bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-full px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40"
                   [(ngModel)]="newComment"
                   (keydown.enter)="submitComment()"
                   placeholder="Write a comment and see which stage catches it..." />
            <button class="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 border-none"
                    [disabled]="!newComment.trim() || isProcessing || classifierStatus === 'unavailable'"
                    (click)="submitComment()">
              Post
            </button>
          </div>
        </div>

      </div>
    </app-demo-layout>
  `
})
export class System1System2CascadeDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'system1-system2-cascade')!;

  schema: ClassifierSchema = {
    context: 'Community comment moderator.',
    questions: [
      {
        id: 'verdict',
        type: 'categorical',
        prompt: 'Classify this community comment.',
        options: [
          { label: 'benign', description: 'Helpful, friendly, or constructive comment' },
          { label: 'toxic', description: 'Insulting, hostile, or harassing comment' },
          { label: 'spam', description: 'Promotional link or scam' }
        ]
      }
    ]
  };

  comments: CascadeComment[] = [
    { id: 1, author: 'maya_dev', text: 'This tutorial saved my weekend, thank you!', verdict: null, confidence: null, resolvedBy: null, latencyMs: null, reason: null, isProcessing: false },
    { id: 2, author: 'watch4less', text: 'BUY CHEAP WATCHES >>> best-deals-watch dot com', verdict: null, confidence: null, resolvedBy: null, latencyMs: null, reason: null, isProcessing: false },
    { id: 3, author: 'grumpy_gus', text: 'You are an idiot and everyone here knows it.', verdict: null, confidence: null, resolvedBy: null, latencyMs: null, reason: null, isProcessing: false },
    { id: 4, author: 'sarcasmo', text: 'Wow, genius idea. Really groundbreaking stuff. Slow clap.', verdict: null, confidence: null, resolvedBy: null, latencyMs: null, reason: null, isProcessing: false },
    { id: 5, author: 'dr_stats', text: 'I disagree with the benchmark methodology, but the data itself is useful.', verdict: null, confidence: null, resolvedBy: null, latencyMs: null, reason: null, isProcessing: false }
  ];

  confidenceGate = 0.80;
  newComment = '';
  isProcessing = false;
  processed = false;

  classifierResolved = 0;
  llmResolved = 0;
  totalClassifierMs = 0;
  totalLlmMs = 0;
  private judgeSession: any = null;

  get statusPills() {
    return [
      { name: 'Classifier', status: this.classifierStatus },
      { name: 'Prompt API (judge)', status: this.languageModelAvailability }
    ];
  }

  get averageClassifierMs(): number | null {
    return this.classifierResolved > 0 ? Math.round(this.totalClassifierMs / this.classifierResolved) : null;
  }

  get averageLlmMs(): number | null {
    return this.llmResolved > 0 ? Math.round(this.totalLlmMs / this.llmResolved) : null;
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
    await this.checkAvailability();
  }

  async processAll() {
    if (this.classifierStatus === 'unavailable') return;
    this.isProcessing = true;
    this.processed = true;
    this.errorMessage = '';
    this.classifierResolved = 0;
    this.llmResolved = 0;
    this.totalClassifierMs = 0;
    this.totalLlmMs = 0;

    try {
      for (const comment of this.comments) {
        await this.moderateSingle(comment);
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Moderation failed.';
    } finally {
      this.isProcessing = false;
    }
  }

  async submitComment() {
    const text = this.newComment.trim();
    if (!text || this.classifierStatus === 'unavailable') return;
    this.newComment = '';
    const item: CascadeComment = {
      id: this.comments.length + 1,
      author: 'you',
      text,
      verdict: null,
      confidence: null,
      resolvedBy: null,
      latencyMs: null,
      reason: null,
      isProcessing: false
    };
    this.comments.unshift(item);
    await this.moderateSingle(item);
  }

  private async moderateSingle(comment: CascadeComment) {
    comment.isProcessing = true;
    try {
      const res = await this.classifierService.classify(this.schema, comment.text, {
        onDownloadProgress: this.onDownloadProgress
      });
      const dec = res.byId['verdict'];
      const conf = dec?.confidence ?? 0;
      comment.confidence = conf;

      if (conf >= this.confidenceGate || this.languageModelAvailability === 'unavailable') {
        comment.verdict = (dec?.label as Verdict) || 'benign';
        comment.resolvedBy = 'classifier';
        comment.latencyMs = res.elapsedMs;
        comment.reason = null;
        this.classifierResolved++;
        this.totalClassifierMs += res.elapsedMs;
      } else {
        const llmStart = performance.now();
        if (!this.judgeSession) {
          this.judgeSession = await LanguageModel.create({
            systemPrompt: 'You are a fair community moderator. Classify each comment as benign, toxic, or spam and explain why in one brief sentence.'
          });
        }
        const raw = await this.judgeSession.prompt(
          `Classify this comment: "${comment.text}"`,
          { responseConstraint: JUDGE_SCHEMA }
        );
        const parsed = JSON.parse(raw);
        const llmMs = Math.round(performance.now() - llmStart);
        comment.verdict = parsed.verdict;
        comment.reason = parsed.reason;
        comment.resolvedBy = 'llm';
        comment.latencyMs = Math.round(res.elapsedMs + llmMs);
        this.llmResolved++;
        this.totalLlmMs += llmMs;
      }
    } finally {
      comment.isProcessing = false;
    }
  }

  verdictChipClass(verdict: Verdict): string {
    if (verdict === 'benign') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (verdict === 'toxic') return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  }
}
