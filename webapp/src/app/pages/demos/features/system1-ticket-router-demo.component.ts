import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema, NormalizedClassifierResult } from '../../../core/services/classifier.service';

declare const Writer: any;

@Component({
  selector: 'app-system1-ticket-router-demo',
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
          unavailableHint="<span class='font-semibold'>Classifier API is required</span> to select the resolution action, and <span class='font-semibold'>Writer API</span> drafts the customer reply.">
        </app-api-status>

        @if (errorMessage) {
          <div class="mb-4 bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>
        }

        <div class="flex flex-col gap-6">
          <!-- 1. Customer Email Card -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/50 flex justify-between items-center">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-envelope-open text-indigo-500"></i> Customer Email
              </span>
              @if (result) {
                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                  <i class="bi bi-lightning-charge-fill"></i> action prepared in {{ result.elapsedMs }}ms
                </span>
              }
            </div>

            <textarea
              class="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none p-5 leading-relaxed text-base min-h-[110px]"
              [(ngModel)]="ticketText"
              (ngModelChange)="onTextChanged()"
              placeholder="Paste or write a customer email..."></textarea>

            <div class="px-5 pb-4 flex flex-wrap gap-2">
              @for (preset of presets; track preset.label) {
                <button type="button"
                        (click)="selectPreset(preset.text)"
                        class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors">
                  {{ preset.label }}
                </button>
              }
            </div>
          </div>

          <!-- 2. Suggested One-Click Resolution & Reply Card -->
          @if (activeAction; as action) {
            <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 flex flex-col gap-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-700/60">
                <div class="flex items-center gap-3.5">
                  <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" [ngClass]="action.iconBg">
                    <i class="bi {{ action.icon }}"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="text-base font-bold text-slate-900 dark:text-white m-0">{{ action.title }}</h4>
                      @if (isUrgent) {
                        <span class="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">Urgent</span>
                      }
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">{{ action.subtitle }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button type="button"
                          (click)="executeAction()"
                          class="px-5 py-2.5 rounded-full text-xs font-semibold transition-all border-none shadow-sm"
                          [ngClass]="actionCompleted ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                    <i class="bi mr-1" [ngClass]="actionCompleted ? 'bi-check-lg' : action.icon"></i>
                    {{ actionCompleted ? action.doneLabel : action.buttonLabel }}
                  </button>

                  <button type="button"
                          (click)="draftReplyWithWriter()"
                          [disabled]="isDrafting || writerStatus === 'unavailable'"
                          class="px-4 py-2.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 transition-all disabled:opacity-50">
                    @if (isDrafting) {
                      <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Drafting...
                    } @else {
                      <i class="bi bi-pen mr-1"></i> Draft Reply (Writer API)
                    }
                  </button>
                </div>
              </div>

              @if (draftedReply) {
                <div class="space-y-2">
                  <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Drafted Customer Reply</div>
                  <textarea
                    rows="4"
                    [(ngModel)]="draftedReply"
                    class="w-full bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none"></textarea>
                </div>
              }
            </div>
          }
        </div>

      </div>
    </app-demo-layout>
  `
})
export class System1TicketRouterDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'system1-ticket-router')!;

  schema: ClassifierSchema = {
    context: 'Customer support action assistant.',
    questions: [
      {
        id: 'recommended_action',
        type: 'categorical',
        prompt: 'Which one-click resolution action should be offered to the support agent?',
        options: [
          { label: 'issue_refund', description: 'Refund a duplicate charge or billing error' },
          { label: 'page_oncall', description: 'Escalate a production crash or outage to engineering' },
          { label: 'log_feature', description: 'Add a customer feature request to the product roadmap' }
        ]
      },
      {
        id: 'is_urgent',
        type: 'binary',
        prompt: 'Is the customer blocked right now?'
      }
    ]
  };

  presets = [
    {
      label: 'Double Charge ($49)',
      text: 'Hi, we were charged twice on our monthly enterprise invoice #4821 ($49.00) and need a refund.'
    },
    {
      label: 'Production Crash',
      text: 'Urgent: our production database pipeline crashes with a fatal segmentation fault and customers cannot sign in!'
    },
    {
      label: 'Feature Request',
      text: 'Could you add a CSV export button and dark mode toggle to the analytics dashboard next quarter?'
    }
  ];

  ticketText = this.presets[0].text;
  result: NormalizedClassifierResult | null = null;
  actionCompleted = false;
  isDrafting = false;
  draftedReply = '';

  private textChanges$ = new Subject<string>();

  get statusPills() {
    return [
      { name: 'Classifier', status: this.classifierStatus },
      { name: 'Writer', status: this.writerStatus }
    ];
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    this.subscriptions.push(
      this.textChanges$.pipe(debounceTime(200)).subscribe(() => this.evaluateTicket())
    );
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
    await this.checkWriterAvailability();
  }

  onTextChanged() {
    this.actionCompleted = false;
    this.draftedReply = '';
    this.textChanges$.next(this.ticketText);
  }

  selectPreset(text: string) {
    this.ticketText = text;
    this.actionCompleted = false;
    this.draftedReply = '';
    this.evaluateTicket();
  }

  async evaluateTicket() {
    if (!this.ticketText.trim() || this.classifierStatus === 'unavailable') return;
    this.errorMessage = '';
    try {
      this.result = await this.classifierService.classify(this.schema, this.ticketText, {
        onDownloadProgress: this.onDownloadProgress
      });
    } catch (e: any) {
      this.errorMessage = e.message || 'Classification failed.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  get isUrgent(): boolean {
    return this.result?.byId['is_urgent']?.label === 'true';
  }

  get activeAction() {
    if (!this.result) return null;
    const actionId = this.result.byId['recommended_action']?.label;
    if (actionId === 'issue_refund') {
      return {
        title: 'Duplicate Charge Detected — Issue Refund',
        subtitle: 'Classifier identified a billing dispute and prepared a one-click refund action.',
        buttonLabel: 'Refund Duplicate Charge',
        doneLabel: 'Refund Issued',
        icon: 'bi-credit-card-2-back',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
      };
    }
    if (actionId === 'page_oncall') {
      return {
        title: 'Production Incident — Page On-Call Engineer',
        subtitle: 'Classifier identified a blocking outage and prepared an engineering escalation.',
        buttonLabel: 'Page On-Call Engineer',
        doneLabel: 'Incident Escalated',
        icon: 'bi-broadcast-pin',
        iconBg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
      };
    }
    return {
      title: 'Product Feedback — Add to Roadmap',
      subtitle: 'Classifier identified a feature request and linked it to the product backlog.',
      buttonLabel: 'Add +1 to Roadmap',
      doneLabel: 'Added to Backlog',
      icon: 'bi-lightbulb',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
    };
  }

  executeAction() {
    this.actionCompleted = true;
  }

  async draftReplyWithWriter() {
    if (!this.activeAction || !('Writer' in self)) return;
    this.isDrafting = true;
    this.errorMessage = '';
    try {
      const writer = await Writer.create({ tone: 'formal', length: 'short' });
      this.draftedReply = await writer.write(
        `Write a brief, helpful customer support reply confirming that we performed "${this.activeAction.title}" in response to their message: "${this.ticketText}"`
      );
      if (typeof writer.destroy === 'function') writer.destroy();
    } catch (e: any) {
      this.errorMessage = e.message || 'Writer API failed to generate reply.';
    } finally {
      this.isDrafting = false;
    }
  }
}
