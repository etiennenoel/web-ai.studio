import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassifierResult } from '../types/classifier-result.type';
import { ClassifierDecision } from '../interfaces/classifier-decision.interface';

/**
 * Renders a `classify()` result: one card per question with the chosen label,
 * confidence, and a probability bar per option.
 */
@Component({
  selector: 'lib-classifier-decisions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid gap-3" [ngClass]="{ 'md:grid-cols-2': columns === 2 }">
      <div *ngFor="let d of decisions" class="rounded-lg border border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 font-mono truncate">{{ d.id }}</div>
            <div class="text-base font-bold text-gray-900 dark:text-white font-mono truncate">{{ d.label }}</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Confidence</div>
            <div class="text-sm font-semibold" [ngClass]="d.confidence >= 0.85 ? 'text-green-600 dark:text-green-400' : (d.confidence >= 0.5 ? 'text-orange-500' : 'text-red-500')">
              {{ d.confidence | percent: '1.0-1' }}
            </div>
          </div>
        </div>

        <div *ngIf="d.expectedScore !== undefined" class="text-xs text-gray-600 dark:text-gray-400 mb-2">
          expectedScore <span class="font-mono text-gray-900 dark:text-gray-200">{{ d.expectedScore | number: '1.2-2' }}</span>
        </div>
        <div *ngIf="d.probability !== undefined" class="text-xs text-gray-600 dark:text-gray-400 mb-2">
          P(true) <span class="font-mono text-gray-900 dark:text-gray-200">{{ d.probability | number: '1.3-3' }}</span>
        </div>

        <div class="space-y-1">
          <div *ngFor="let p of d.probabilities" class="flex items-center gap-2 text-xs">
            <span class="w-28 truncate font-mono" [ngClass]="p.label === d.label ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'" [title]="p.label">{{ p.label }}</span>
            <div class="flex-1 h-2 rounded-full bg-gray-200 dark:bg-[#3c4043] overflow-hidden">
              <div class="h-full rounded-full transition-all" [ngClass]="p.label === d.label ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'" [style.width.%]="p.probability * 100"></div>
            </div>
            <span class="w-12 text-right font-mono text-gray-600 dark:text-gray-400">{{ p.probability | percent: '1.0-1' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ClassifierDecisionsComponent {
  @Input() columns: 1 | 2 = 2;

  decisions: ClassifierDecision[] = [];

  @Input() set result(value: ClassifierResult | null | undefined) {
    this.decisions = value ? Object.values(value) : [];
  }
}
