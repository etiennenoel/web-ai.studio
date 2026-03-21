import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoadingLabelService } from '../../core/services/loading-label.service';
import { LoadingLabel } from '../../core/models/loading-label.model';

@Component({
  selector: 'app-latency-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3 my-1">
      <div class="flex gap-1.5 items-center h-5">
        <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-40 animate-[dot-bounce_1.4s_infinite_ease-in-out]"></div>
        <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-40 animate-[dot-bounce_1.4s_infinite_ease-in-out]" style="animation-delay: 0.2s"></div>
        <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-40 animate-[dot-bounce_1.4s_infinite_ease-in-out]" style="animation-delay: 0.4s"></div>
      </div>
      
      <div aria-live="polite">
        @if (currentLabel; as label) {
          <div class="text-sm text-slate-500 dark:text-slate-400 font-medium fade-in-out">
            {{ isInitialState() ? 'Processing.' : label.text }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      opacity: 0;
      animation: delayedFadeIn 0.3s ease-in forwards;
      animation-delay: 200ms;
    }

    @keyframes dot-bounce {
      0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
      40% { transform: scale(1.5); opacity: 1; }
    }

    .fade-in-out {
      animation: labelFade 0.4s ease-in-out forwards;
    }

    @keyframes labelFade {
      0% { opacity: 0; transform: translateY(2px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes delayedFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})

export class LatencyLoaderComponent implements OnInit, OnDestroy {
  @Input() startTime: number = Date.now();
  currentLabel: LoadingLabel | null = null;
  private timeoutId: any;

  constructor(private labelService: LoadingLabelService) {}

  ngOnInit() {
    this.updateLabel();
    this.scheduleNextUpdate();
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  isInitialState(): boolean {
    return (Date.now() - this.startTime) < 1200;
  }

  private scheduleNextUpdate() {
    const elapsed = Date.now() - this.startTime;
    let baseDelay = 2200;
    let jitter = 0.3;

    if (elapsed < 1200) {
      baseDelay = 900;
      jitter = 0.2;
    } else if (elapsed < 5000) {
      baseDelay = 2200;
      jitter = 0.4;
    } else {
      baseDelay = 4500;
      jitter = 0.5;
    }

    const delay = baseDelay * (1 - jitter / 2 + Math.random() * jitter);

    this.timeoutId = setTimeout(() => {
      this.updateLabel();
      this.scheduleNextUpdate();
    }, delay);
  }

  private updateLabel() {
    const elapsed = Date.now() - this.startTime;
    let label: LoadingLabel | null = null;

    if (elapsed < 1200) {
      label = this.labelService.getRandomLabel('receipt');
    } else if (elapsed < 5000) {
      label = this.labelService.getRandomLabel('proof_of_work');
    } else if (elapsed < 20000) {
      label = this.labelService.getRandomLabel('engagement');
    } else {
      label = this.labelService.getRandomLabel('long_running');
    }

    if (label) {
      // Forcing a fresh reference so the @if re-renders and triggers the animation
      this.currentLabel = { ...label };
    }
  }
}