import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema, NormalizedClassifierResult } from '../../../core/services/classifier.service';

declare const Rewriter: any;

@Component({
  selector: 'app-live-draft-guardrails-demo',
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
          unavailableHint="<span class='font-semibold'>Classifier API</span> checks your draft locally, and <span class='font-semibold'>Rewriter API</span> softens harsh phrasing in one click.">
        </app-api-status>

        @if (errorMessage) {
          <div class="mb-4 bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>
        }

        <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
          <!-- Header -->
          <div class="px-5 py-4 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/50 flex justify-between items-center">
            <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <i class="bi bi-chat-heart text-indigo-500"></i> Team Reply Composer
            </span>
            @if (result) {
              <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                checked in {{ result.elapsedMs }}ms
              </span>
            }
          </div>

          <!-- Editor -->
          <textarea
            class="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none p-5 leading-relaxed text-base min-h-[130px]"
            [(ngModel)]="draftText"
            (ngModelChange)="onDraftChanged()"
            placeholder="Write a reply to your team..."></textarea>

          <!-- Sample pills -->
          <div class="px-5 pb-4 flex flex-wrap gap-2">
            @for (sample of samples; track sample.label) {
              <button type="button"
                      (click)="useSample(sample.text)"
                      class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors">
                {{ sample.label }}
              </button>
            }
          </div>

          <!-- Inline Coach Banner (Only appears when Classifier detects a secret or harsh tone) -->
          @if (soundsHarsh || containsSecret) {
            <div class="mx-5 mb-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                 [ngClass]="containsSecret
                   ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                   : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'">
              <div class="flex items-center gap-3 text-sm">
                <i class="bi text-lg" [ngClass]="containsSecret ? 'bi-key-fill text-rose-500' : 'bi-stars text-amber-500'"></i>
                <span>
                  @if (containsSecret) {
                    <strong>Heads up:</strong> It looks like your draft includes an API key or private phone number.
                  } @else {
                    <strong>Kindness nudge:</strong> This reply might come across as harsh. Want to soften it before sending?
                  }
                </span>
              </div>

              @if (soundsHarsh) {
                <button type="button"
                        (click)="softenWithRewriter()"
                        [disabled]="isRewriting || rewriterStatus === 'unavailable'"
                        class="px-4 py-2 rounded-full text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm shrink-0 disabled:opacity-50">
                  @if (isRewriting) {
                    <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Softening...
                  } @else {
                    <i class="bi bi-magic mr-1"></i> Soften with Rewriter API
                  }
                </button>
              }
            </div>
          }

          <!-- Footer Bar -->
          <div class="px-5 py-3.5 bg-slate-50/70 dark:bg-zinc-900/60 border-t border-slate-100 dark:border-zinc-700/50 flex items-center justify-between gap-4">
            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
              @if (published) {
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold"><i class="bi bi-check-circle-fill mr-1"></i> Message sent!</span>
              } @else if (!soundsHarsh && !containsSecret && result) {
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold"><i class="bi bi-check2-circle mr-1"></i> Looks friendly and safe to send</span>
              } @else {
                <span>Checked locally on-device</span>
              }
            </div>

            <button type="button"
                    [disabled]="containsSecret"
                    (click)="published = true"
                    class="px-5 py-2 rounded-full text-xs font-semibold transition-all border-none"
                    [ngClass]="!containsSecret ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'">
              Send Message
            </button>
          </div>
        </div>

      </div>
    </app-demo-layout>
  `
})
export class LiveDraftGuardrailsDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'live-draft-guardrails')!;

  schema: ClassifierSchema = {
    context: 'Friendly writing coach and secret shield.',
    questions: [
      {
        id: 'contains_secret',
        type: 'binary',
        prompt: 'Does this draft contain an API key, token, or phone number?'
      },
      {
        id: 'sounds_harsh',
        type: 'binary',
        prompt: 'Does the draft sound harsh, insulting, or passive-aggressive?'
      }
    ]
  };

  samples = [
    {
      label: 'Frustrated Reply',
      text: 'Per my last email, only a complete amateur would break the build like this without running the tests first.'
    },
    {
      label: 'Accidental Key Leak',
      text: 'Here is the failing request using sk-live-9842a8f71b2c — call me at 415-555-0199 if it still fails.'
    },
    {
      label: 'Friendly Reply',
      text: 'Thanks for catching this! Let me pull the branch locally and add a regression test.'
    }
  ];

  draftText = this.samples[0].text;
  result: NormalizedClassifierResult | null = null;
  isRewriting = false;
  published = false;
  private draftChanges$ = new Subject<string>();

  get statusPills() {
    return [
      { name: 'Classifier', status: this.classifierStatus },
      { name: 'Rewriter', status: this.rewriterStatus }
    ];
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.subscriptions.push(
      this.draftChanges$.pipe(debounceTime(200)).subscribe(() => this.verifyDraft())
    );
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
    await this.checkRewriterAvailability();
    if (this.classifierStatus !== 'unavailable') {
      await this.verifyDraft();
    }
  }

  onDraftChanged() {
    this.published = false;
    this.draftChanges$.next(this.draftText);
  }

  useSample(text: string) {
    this.draftText = text;
    this.published = false;
    this.verifyDraft();
  }

  async verifyDraft() {
    if (!this.draftText.trim() || this.classifierStatus === 'unavailable') return;
    this.errorMessage = '';
    try {
      this.result = await this.classifierService.classify(this.schema, this.draftText, {
        onDownloadProgress: this.onDownloadProgress
      });
    } catch (e: any) {
      this.errorMessage = e.message || 'Classification failed.';
    }
  }

  get containsSecret(): boolean {
    return this.result?.byId['contains_secret']?.label === 'true';
  }

  get soundsHarsh(): boolean {
    return this.result?.byId['sounds_harsh']?.label === 'true';
  }

  async softenWithRewriter() {
    if (!('Rewriter' in self)) return;
    this.isRewriting = true;
    this.errorMessage = '';
    try {
      const rewriter = await Rewriter.create({ tone: 'more-formal' });
      this.draftText = await rewriter.rewrite(this.draftText, {
        context: 'Rewrite this message so it sounds kind, constructive, and collaborative.'
      });
      if (typeof rewriter.destroy === 'function') rewriter.destroy();
      await this.verifyDraft();
    } catch (e: any) {
      this.errorMessage = e.message || 'Rewriter API failed.';
    } finally {
      this.isRewriting = false;
    }
  }
}
