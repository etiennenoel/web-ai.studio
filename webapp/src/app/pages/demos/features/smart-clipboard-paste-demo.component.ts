import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema, NormalizedClassifierResult } from '../../../core/services/classifier.service';

@Component({
  selector: 'app-smart-clipboard-paste-demo',
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

        <app-classifier-status
          [classifierStatus]="classifierStatus"
          [isDownloading]="isDownloading"
          [downloadProgress]="downloadProgress">
        </app-classifier-status>

        @if (errorMessage) {
          <div class="mb-4 bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>
        }

        <div class="flex flex-col gap-6">
          <!-- 1. Paste Dropzone Card -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-[#161616]/50 flex justify-between items-center">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-clipboard-check text-indigo-500"></i> Paste Anything
              </span>
              @if (result) {
                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                  <i class="bi bi-lightning-charge-fill"></i> matched in {{ result.elapsedMs }}ms
                </span>
              }
            </div>

            <textarea
              class="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none p-5 leading-relaxed text-base min-h-[100px]"
              [(ngModel)]="pastedText"
              (keydown.enter)="$event.preventDefault(); analyzePaste()"
              placeholder="Paste a meeting snippet, a curl command, an invoice note, or a tracking update..."></textarea>

            <div class="px-5 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                @for (sample of samples; track sample.label) {
                  <button type="button"
                          (click)="useSample(sample.text)"
                          class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors">
                    {{ sample.label }}
                  </button>
                }
              </div>

              <button type="button"
                      (click)="analyzePaste()"
                      [disabled]="isAnalyzing || classifierStatus === 'unavailable'"
                      class="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all border-none disabled:opacity-50">
                @if (isAnalyzing) {
                  <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Detecting...
                } @else {
                  Suggest Smart Action
                }
              </button>
            </div>
          </div>

          <!-- 2. Contextual Smart Action Card -->
          @if (smartCard; as card) {
            <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" [ngClass]="card.iconBg">
                  <i class="bi {{ card.icon }}"></i>
                </div>
                <div>
                  <h4 class="text-base font-bold text-slate-900 dark:text-white m-0">{{ card.title }}</h4>
                  <p class="text-sm text-slate-500 dark:text-slate-400 m-0 mt-1">{{ card.description }}</p>
                </div>
              </div>

              <button type="button"
                      (click)="completed = true"
                      class="px-5 py-2.5 rounded-full text-xs font-semibold border-none shadow-sm shrink-0 transition-all"
                      [ngClass]="completed ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                <i class="bi mr-1" [ngClass]="completed ? 'bi-check-lg' : card.icon"></i>
                {{ completed ? card.doneLabel : card.ctaLabel }}
              </button>
            </div>
          }
        </div>

      </div>
    </app-demo-layout>
  `
})
export class SmartClipboardPasteDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'smart-clipboard-paste')!;

  schema: ClassifierSchema = {
    context: 'Smart clipboard paste action detector.',
    questions: [
      {
        id: 'paste_type',
        type: 'categorical',
        prompt: 'What kind of content did the user paste from their clipboard?',
        options: [
          { label: 'calendar_invite', description: 'Meeting time, date, or call scheduling note' },
          { label: 'curl_command', description: 'cURL request, API endpoint, or terminal snippet' },
          { label: 'expense_receipt', description: 'Flight, hotel, meal, or taxi receipt amount' },
          { label: 'shipping_update', description: 'Package tracking number or delivery status' }
        ]
      }
    ]
  };

  samples = [
    {
      label: 'Meeting Invite',
      text: 'Let’s sync on the Q3 launch tomorrow (Thursday) from 2:00 PM to 2:45 PM PST over Google Meet.'
    },
    {
      label: 'cURL Command',
      text: 'curl -X POST https://api.example.com/v1/charges -H "Authorization: Bearer tok_123" -d amount=2500'
    },
    {
      label: 'Expense Receipt',
      text: 'Uber trip from SFO Terminal 2 to Moscone Center — Total charged: $46.80 on Visa *4821.'
    },
    {
      label: 'Package Tracking',
      text: 'Your shipment 1Z999AA10123456784 departed Memphis hub and arrives by Friday 5:00 PM.'
    }
  ];

  pastedText = this.samples[0].text;
  result: NormalizedClassifierResult | null = null;
  isAnalyzing = false;
  completed = false;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
    if (this.classifierStatus !== 'unavailable') {
      await this.analyzePaste();
    }
  }

  useSample(text: string) {
    this.pastedText = text;
    this.completed = false;
    this.analyzePaste();
  }

  async analyzePaste() {
    if (!this.pastedText.trim() || this.classifierStatus === 'unavailable') return;
    this.isAnalyzing = true;
    this.completed = false;
    this.errorMessage = '';
    try {
      this.result = await this.classifierService.classify(this.schema, this.pastedText, {
        onDownloadProgress: this.onDownloadProgress
      });
    } catch (e: any) {
      this.errorMessage = e.message || 'Classification failed.';
    } finally {
      this.isAnalyzing = false;
    }
  }

  get smartCard() {
    if (!this.result) return null;
    const type = this.result.byId['paste_type']?.label;
    if (type === 'calendar_invite') {
      return {
        title: 'Add Event to Calendar',
        description: 'Detected a meeting time in your clipboard. Create a calendar block in one click.',
        ctaLabel: 'Add to Calendar',
        doneLabel: 'Added to Calendar',
        icon: 'bi-calendar-event',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
      };
    }
    if (type === 'curl_command') {
      return {
        title: 'Convert cURL to JavaScript fetch()',
        description: 'Detected an HTTP terminal command. Copy it as a clean browser fetch() snippet.',
        ctaLabel: 'Convert to fetch()',
        doneLabel: 'Copied fetch() Code',
        icon: 'bi-terminal',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
      };
    }
    if (type === 'expense_receipt') {
      return {
        title: 'Log Reimbursable Expense',
        description: 'Detected a travel/meal receipt. Add it directly to your monthly expense report.',
        ctaLabel: 'Add to Expense Report',
        doneLabel: 'Expense Logged',
        icon: 'bi-receipt',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
      };
    }
    return {
      title: 'Track Package Delivery',
      description: 'Detected a carrier shipment update. Pin live delivery status to your sidebar.',
      ctaLabel: 'Pin Live Tracker',
      doneLabel: 'Tracker Pinned',
      icon: 'bi-box-seam',
      iconBg: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
    };
  }
}
