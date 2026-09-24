import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema, NormalizedClassifierResult } from '../../../core/services/classifier.service';

declare const Summarizer: any;

@Component({
  selector: 'app-chameleon-adaptive-ui-demo',
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
          unavailableHint="<span class='font-semibold'>Classifier API</span> chooses the best reading format, and <span class='font-semibold'>Summarizer API</span> condenses the article.">
        </app-api-status>

        @if (errorMessage) {
          <div class="mb-4 bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>
        }

        <div class="flex flex-col gap-6">
          <!-- 1. Reader Preference Input -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-grow flex items-center gap-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-full px-4 py-2.5">
                <i class="bi bi-clock-history text-indigo-500"></i>
                <input type="text"
                       [(ngModel)]="userPrompt"
                       (keydown.enter)="adaptArticle()"
                       class="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200"
                       placeholder="Tell the reader how much time you have..." />
              </div>
              <button type="button"
                      (click)="adaptArticle()"
                      [disabled]="isAdapting || classifierStatus === 'unavailable'"
                      class="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all border-none disabled:opacity-50">
                @if (isAdapting) {
                  <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Adapting...
                } @else {
                  Adapt Reading View
                }
              </button>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              @for (s of scenarios; track s.title) {
                <button type="button"
                        (click)="selectScenario(s.text)"
                        class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                        [ngClass]="userPrompt === s.text
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'">
                  {{ s.title }}
                </button>
              }
            </div>
          </div>

          <!-- 2. Adapted Article View -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 sm:p-8">
            <div class="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-zinc-700/50">
              <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                {{ readingModeLabel }}
              </span>
              @if (result) {
                <span class="text-xs text-slate-400 font-mono">
                  selected in {{ result.elapsedMs }}ms
                </span>
              }
            </div>

            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-3">
              Why On-Device Hybrid AI Changes Web Applications
            </h2>

            @if (isSummarizing) {
              <div class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <i class="bi bi-arrow-repeat animate-spin text-indigo-500 mr-1.5"></i>
                Condensing article with Summarizer API...
              </div>
            } @else if (summaryOutput && readingMode !== 'full_article') {
              <div class="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/40 text-slate-800 dark:text-slate-200 text-base leading-relaxed whitespace-pre-line">
                {{ summaryOutput }}
              </div>
            } @else {
              <div class="space-y-4 text-slate-700 dark:text-slate-300 text-base leading-relaxed">
                @for (p of articleParagraphs; track p) {
                  <p class="m-0">{{ p }}</p>
                }
              </div>
            }
          </div>
        </div>

      </div>
    </app-demo-layout>
  `
})
export class ChameleonAdaptiveUiDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'chameleon-adaptive-ui')!;

  schema: ClassifierSchema = {
    context: 'Adaptive article reader controller.',
    questions: [
      {
        id: 'reading_mode',
        type: 'categorical',
        prompt: 'How would the user like to read this article?',
        options: [
          { label: 'quick_tldr', description: '30-second executive TL;DR summary' },
          { label: 'key_takeaways', description: 'Bulleted key takeaways and action items' },
          { label: 'full_article', description: 'Full distraction-free article text' }
        ]
      }
    ]
  };

  articleParagraphs = [
    'Modern web applications increasingly combine two distinct classes of on-device models: fast, non-autoregressive System-1 decision models (like window.Classifier and SemanticEmbedder) and generative System-2 language models (like LanguageModel, Summarizer, Writer, and Rewriter).',
    'While generative models excel at drafting prose and synthesizing long documents, invoking a multi-billion parameter LLM on every keystroke or scroll event drains laptop batteries and introduces hundreds of milliseconds of latency.',
    'By placing a 15-millisecond System-1 classifier in front of generative APIs, web apps can understand user intent on every interaction and only wake up heavier generative tools with the exact configuration needed.'
  ];

  scenarios = [
    {
      title: 'I only have 30 seconds',
      text: 'I am boarding a flight in 30 seconds — just give me the one-sentence TL;DR.'
    },
    {
      title: 'Bulleted key takeaways',
      text: 'Give me the bulleted key takeaways so I can share them in standup.'
    },
    {
      title: 'Read the full article',
      text: 'I have plenty of time and want to read the full unabridged article.'
    }
  ];

  userPrompt = this.scenarios[0].text;
  result: NormalizedClassifierResult | null = null;
  isAdapting = false;
  isSummarizing = false;
  summaryOutput = '';

  get statusPills() {
    return [
      { name: 'Classifier', status: this.classifierStatus },
      { name: 'Summarizer', status: this.summarizerStatus }
    ];
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
    await this.checkSummarizerAvailability();
  }

  selectScenario(text: string) {
    this.userPrompt = text;
    this.adaptArticle();
  }

  async adaptArticle() {
    if (!this.userPrompt.trim() || this.classifierStatus === 'unavailable') return;
    this.isAdapting = true;
    this.errorMessage = '';
    try {
      this.result = await this.classifierService.classify(this.schema, this.userPrompt, {
        onDownloadProgress: this.onDownloadProgress
      });
      await this.runSummarizerIfNeeded();
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to adapt article.';
    } finally {
      this.isAdapting = false;
      this.cdr.detectChanges();
    }
  }

  private async runSummarizerIfNeeded() {
    if (this.readingMode === 'full_article') {
      this.summaryOutput = '';
      return;
    }
    if (!('Summarizer' in self) || this.summarizerStatus === 'unavailable') {
      return;
    }
    this.isSummarizing = true;
    try {
      const summarizer = await Summarizer.create({
        type: this.readingMode === 'quick_tldr' ? 'tldr' : 'key-points',
        length: 'short'
      });
      this.summaryOutput = await summarizer.summarize(this.articleParagraphs.join('\n\n'));
      if (typeof summarizer.destroy === 'function') summarizer.destroy();
    } catch (e: any) {
      this.errorMessage = e.message || 'Summarizer API failed.';
    } finally {
      this.isSummarizing = false;
    }
  }

  get readingMode(): string {
    return this.result?.byId['reading_mode']?.label || 'full_article';
  }

  get readingModeLabel(): string {
    if (this.readingMode === 'quick_tldr') return '30-Second TL;DR View';
    if (this.readingMode === 'key_takeaways') return 'Bulleted Key Takeaways';
    return 'Full Article Reader';
  }
}
