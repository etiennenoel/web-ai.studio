import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseClassifierDemoComponent } from '../components/base-demo/base-classifier-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ClassifierSchema, NormalizedClassifierResult } from '../../../core/services/classifier.service';

@Component({
  selector: 'app-instant-form-autofill-demo',
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
          <!-- 1. One-Sentence Expense Description -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-5">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-grow flex items-center gap-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-zinc-700 rounded-full px-4 py-2.5">
                <i class="bi bi-magic text-indigo-500"></i>
                <input type="text"
                       [(ngModel)]="noteText"
                       (keydown.enter)="autofillForm()"
                       class="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200"
                       placeholder="Describe your expense in one sentence..." />
              </div>
              <button type="button"
                      (click)="autofillForm()"
                      [disabled]="isFilling || classifierStatus === 'unavailable'"
                      class="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all border-none disabled:opacity-50">
                @if (isFilling) {
                  <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Filling...
                } @else {
                  Auto-Fill Form
                }
              </button>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              @for (s of samples; track s.label) {
                <button type="button"
                        (click)="selectSample(s.text)"
                        class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700 transition-colors">
                  {{ s.label }}
                </button>
              }
            </div>
          </div>

          <!-- 2. Structured Expense Form (Automatically Selected by Classifier) -->
          <div class="bg-[#ffffff] dark:bg-zinc-800/90 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-700/60">
              <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <i class="bi bi-ui-checks text-indigo-500"></i> Expense Report Form
              </span>
              @if (result) {
                <span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  filled in {{ result.elapsedMs }}ms
                </span>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expense Category</label>
                <select [(ngModel)]="expenseCategory"
                        class="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <option value="ground_transport">Ground Transport (Taxi / Rail)</option>
                  <option value="airfare_lodging">Airfare &amp; Lodging</option>
                  <option value="client_meals">Client Meals &amp; Hospitality</option>
                  <option value="software_saas">Software &amp; Cloud Subscriptions</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cost Tier</label>
                <select [(ngModel)]="costTier"
                        class="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <option value="under_75">Under $75 (Auto-Approved)</option>
                  <option value="75_to_500">$75 – $500 (Manager Review)</option>
                  <option value="over_500">$500+ (VP Sign-off)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Client Billable?</label>
                <select [(ngModel)]="clientBillable"
                        class="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <option value="true">Yes — Bill to Client Project</option>
                  <option value="false">No — Internal Team Budget</option>
                </select>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button type="button"
                      (click)="submitted = true"
                      class="px-6 py-2.5 rounded-full text-xs font-semibold border-none shadow-sm transition-all"
                      [ngClass]="submitted ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                <i class="bi mr-1" [ngClass]="submitted ? 'bi-check-lg' : 'bi-send'"></i>
                {{ submitted ? 'Expense Submitted!' : 'Submit Expense Report' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </app-demo-layout>
  `
})
export class InstantFormAutofillDemoComponent extends BaseClassifierDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'instant-form-autofill')!;

  schema: ClassifierSchema = {
    context: 'Corporate expense report form dropdown filler.',
    questions: [
      {
        id: 'expense_category',
        type: 'categorical',
        prompt: 'Which accounting category fits this expense?',
        options: [
          { label: 'ground_transport', description: 'Uber, Lyft, taxi, train, or parking' },
          { label: 'airfare_lodging', description: 'Airline flight ticket or hotel stay' },
          { label: 'client_meals', description: 'Lunch, dinner, or coffee with clients' },
          { label: 'software_saas', description: 'Developer tool, cloud hosting, or software license' }
        ]
      },
      {
        id: 'cost_tier',
        type: 'categorical',
        prompt: 'Select the cost approval tier.',
        options: [
          { label: 'under_75', description: 'Small expense under $75' },
          { label: '75_to_500', description: 'Medium expense between $75 and $500' },
          { label: 'over_500', description: 'Large expense over $500' }
        ]
      },
      {
        id: 'client_billable',
        type: 'binary',
        prompt: 'Was this expense incurred directly for a client meeting or client project?'
      }
    ]
  };

  samples = [
    { label: '$42 Uber to Client Site', text: 'Took a $42 Uber from SFO airport directly to the Acme client kickoff meeting.' },
    { label: '$890 Flight to Conference', text: 'Round-trip $890 Delta flight to attend our internal engineering summit.' },
    { label: '$29 Dev Tool Subscription', text: 'Monthly $29 license for local profiling software for our internal team.' }
  ];

  noteText = this.samples[0].text;
  expenseCategory = 'ground_transport';
  costTier = 'under_75';
  clientBillable = 'true';
  isFilling = false;
  submitted = false;
  result: NormalizedClassifierResult | null = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkClassifierAvailability(this.schema);
    if (this.classifierStatus !== 'unavailable') {
      await this.autofillForm();
    }
  }

  selectSample(text: string) {
    this.noteText = text;
    this.submitted = false;
    this.autofillForm();
  }

  async autofillForm() {
    if (!this.noteText.trim() || this.classifierStatus === 'unavailable') return;
    this.isFilling = true;
    this.submitted = false;
    this.errorMessage = '';
    try {
      this.result = await this.classifierService.classify(this.schema, this.noteText, {
        onDownloadProgress: this.onDownloadProgress
      });
      this.expenseCategory = this.result.byId['expense_category']?.label || 'ground_transport';
      this.costTier = this.result.byId['cost_tier']?.label || 'under_75';
      this.clientBillable = this.result.byId['client_billable']?.label || 'false';
    } catch (e: any) {
      this.errorMessage = e.message || 'Auto-fill failed.';
    } finally {
      this.isFilling = false;
    }
  }
}
