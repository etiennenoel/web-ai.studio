import { Component, ChangeDetectorRef, Input, OnInit } from '@angular/core';

interface ComparisonSideState {
  code: string;
  output: string;
  /** Measured samples, warm-up excluded. */
  samples: number[];
  reported: boolean;
  running: boolean;
  editorHeight: string;
}

type RunPhase = 'idle' | 'warmup' | 'measuring' | 'done';

/**
 * Side-by-side "do" / "don't" runner.
 *
 * When [timed] is true the component is a benchmark, and on-device inference is
 * noisy enough that a single sample per side is meaningless: the model loads once
 * and stays resident, so whichever side runs first absorbs the cold start, and
 * response-length variance alone can swing a run by more than the effect being
 * measured. The harness therefore discards a warm-up run per side, takes three
 * measured samples each in alternating order, compares medians, and refuses to
 * declare a winner when the gap falls inside the observed spread.
 */
@Component({
  selector: 'app-practice-comparison',
  template: `
    <div class="my-8 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#161616] overflow-hidden shadow-sm">
      <!-- Header -->
      <div class="px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#1e1e1e]">
        <div class="flex items-center gap-2.5">
          <i class="bi bi-ui-checks-grid text-indigo-500 dark:text-indigo-400"></i>
          <span class="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400">{{ title }}</span>
        </div>
        @if (runnable) {
          <div class="flex items-center gap-3">
            @if (phase !== 'idle' && isAnyRunning) {
              <span class="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                {{ phase === 'warmup' ? 'warm-up (discarded)' : 'sample ' + repIndex + '/' + REPETITIONS }}
              </span>
            }
            <button (click)="runBoth()" [disabled]="isAnyRunning"
                    class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-colors m-0">
              @if (isAnyRunning) {
                <span class="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Running…
              } @else {
                <i [class]="timed ? 'bi bi-stopwatch' : 'bi bi-play-fill'"></i>
                {{ timed ? 'Benchmark both' : 'Run both' }}
              }
            </button>
          </div>
        }
      </div>

      <!-- Side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
        @for (side of sides; track side.key) {
          @let state = side.key === 'do' ? doState : dontState;
          <div class="flex flex-col">
            <!-- Side header -->
            <div class="px-4 py-2.5 flex items-center justify-between"
                 [ngClass]="side.key === 'do' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'">
              <div class="flex items-center gap-2">
                <i class="bi text-sm"
                   [ngClass]="side.key === 'do' ? 'bi-check-circle-fill text-emerald-600 dark:text-emerald-400' : 'bi-x-circle-fill text-red-600 dark:text-red-400'"></i>
                <span class="text-xs font-bold uppercase tracking-wider"
                      [ngClass]="side.key === 'do' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'">
                  {{ side.key === 'do' ? doLabel : dontLabel }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                @if (timed && median(state) !== null) {
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                        [ngClass]="side.key === 'do' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'">
                    {{ median(state) | number: '1.0-0' }}<span class="opacity-60 ml-0.5">ms</span>
                  </span>
                }
                @if (runnable) {
                  <button (click)="runSingle(side.key)" [disabled]="isAnyRunning"
                          class="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-200/70 hover:bg-slate-300/70 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-slate-300 disabled:opacity-50 transition-colors m-0">
                    <i class="bi bi-play-fill"></i> Run
                  </button>
                }
              </div>
            </div>

            <!-- Code -->
            <div class="relative w-full flex-grow bg-[#ffffff] dark:bg-[#161616]">
              <app-code-editor [code]="state.code" (codeChange)="onCodeChange(side.key, $event)" [readOnly]="false" [height]="state.editorHeight"></app-code-editor>
            </div>

            <!-- Output -->
            @if (state.output) {
              <div class="w-full bg-slate-900 border-t border-zinc-800 p-4">
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Output</span>
                  <button (click)="state.output = ''" class="hover:text-slate-300 transition-colors m-0 p-0 bg-transparent border-0"><i class="bi bi-x-lg"></i></button>
                </div>
                <pre class="text-[12px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed m-0">{{ state.output }}</pre>
              </div>
            }
          </div>
        }
      </div>

      <!-- Timing comparison -->
      @if (timed && median(doState) !== null && median(dontState) !== null) {
        <div class="px-5 py-4 border-t border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#1e1e1e]">
          <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 mb-3 flex items-center gap-2">
            <i class="bi bi-speedometer2"></i>
            {{ doState.reported || dontState.reported ? metricLabel : 'Total run time' }}
            <span class="font-normal normal-case tracking-normal text-slate-400 dark:text-zinc-600">
              — median of {{ doState.samples.length }}, warm-up discarded
            </span>
          </div>
          <div class="flex flex-col gap-2">
            @for (side of sides; track side.key) {
              @let state = side.key === 'do' ? doState : dontState;
              <div class="flex items-center gap-3">
                <span class="w-20 text-right text-[11px] font-bold flex-shrink-0"
                      [ngClass]="side.key === 'do' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                  {{ side.key === 'do' ? doLabel : dontLabel }}
                </span>
                <div class="flex-grow h-5 rounded-md bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                       [ngClass]="side.key === 'do' ? 'bg-emerald-500 dark:bg-emerald-500/80' : 'bg-red-500 dark:bg-red-500/80'"
                       [style.width.%]="barWidth(median(state)!)">
                    <span class="text-[10px] font-mono font-bold text-white whitespace-nowrap">{{ median(state) | number: '1.0-0' }} ms</span>
                  </div>
                </div>
                <span class="w-32 text-[10px] font-mono text-slate-400 dark:text-zinc-500 flex-shrink-0">
                  {{ spreadLabel(state) }}
                </span>
              </div>
            }
          </div>
          <div class="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
            @switch (verdict) {
              @case ('do') {
                <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ speedupLabel }}</span> — the gap is larger than the run-to-run spread, so this is a real difference on your hardware.
              }
              @case ('dont') {
                <span class="text-amber-600 dark:text-amber-400 font-bold">The "don't" side measured faster here.</span>
                Worth investigating rather than ignoring — on some hardware the effect this lesson describes is genuinely small.
              }
              @default {
                <span class="text-slate-500 dark:text-slate-400 font-bold">Within measurement noise on this device.</span>
                The medians differ by less than the spread between repeat runs, so no winner can be claimed from this sample.
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  standalone: false,
})
export class PracticeComparisonComponent implements OnInit {
  @Input() title: string = 'Interactive comparison';
  @Input() doLabel: string = 'Do';
  @Input() dontLabel: string = "Don't";
  @Input() doCode: string = '';
  @Input() dontCode: string = '';
  @Input() runnable: boolean = true;
  /**
   * Set false when the effect is smaller than on-device timing noise. The pair
   * still runs so the outputs can be compared, but no stopwatch is shown —
   * a misleading number is worse than no number.
   */
  @Input() timed: boolean = true;
  /** Shown above the bars when the snippets report their own metric. */
  @Input() metricLabel: string = 'User-perceived wait (reported by the snippets)';

  readonly REPETITIONS = 3;

  doState: ComparisonSideState = this.newState();
  dontState: ComparisonSideState = this.newState();

  phase: RunPhase = 'idle';
  repIndex = 0;

  readonly sides: { key: 'do' | 'dont' }[] = [{ key: 'do' }, { key: 'dont' }];

  constructor(private cdr: ChangeDetectorRef) {}

  private newState(): ComparisonSideState {
    return { code: '', output: '', samples: [], reported: false, running: false, editorHeight: '100px' };
  }

  ngOnInit() {
    this.doState.code = this.doCode;
    this.dontState.code = this.dontCode;
    this.doState.editorHeight = this.calculateHeight(this.doCode);
    this.dontState.editorHeight = this.calculateHeight(this.dontCode);
  }

  private calculateHeight(code: string): string {
    if (!code) {
      return '100px';
    }
    const lines = code.split('\n').length;
    // 21px per line (line-height 1.5 of ~14px font) + 50px extra padding
    return Math.max(100, lines * 21 + 50) + 'px';
  }

  get isAnyRunning(): boolean {
    return this.doState.running || this.dontState.running;
  }

  median(state: ComparisonSideState): number | null {
    if (!state.samples.length) {
      return null;
    }
    const sorted = [...state.samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private spread(state: ComparisonSideState): number {
    if (state.samples.length < 2) {
      return 0;
    }
    return Math.max(...state.samples) - Math.min(...state.samples);
  }

  spreadLabel(state: ComparisonSideState): string {
    if (state.samples.length < 2) {
      return 'single run';
    }
    return `${Math.min(...state.samples).toFixed(0)}–${Math.max(...state.samples).toFixed(0)} ms`;
  }

  /** 'do' | 'dont' when the median gap clears the noise floor, else 'noise'. */
  get verdict(): 'do' | 'dont' | 'noise' {
    const doMedian = this.median(this.doState);
    const dontMedian = this.median(this.dontState);
    if (doMedian === null || dontMedian === null) {
      return 'noise';
    }
    // With only one sample each there is no spread to compare against, so the
    // noise floor is unknown — never claim a winner.
    if (this.doState.samples.length < 2 || this.dontState.samples.length < 2) {
      return 'noise';
    }
    const noiseFloor = Math.max(this.spread(this.doState), this.spread(this.dontState));
    const gap = dontMedian - doMedian;
    if (gap > noiseFloor) {
      return 'do';
    }
    if (-gap > noiseFloor) {
      return 'dont';
    }
    return 'noise';
  }

  get speedupLabel(): string {
    const doMedian = this.median(this.doState);
    const dontMedian = this.median(this.dontState);
    if (doMedian === null || dontMedian === null || doMedian <= 0) {
      return '';
    }
    const factor = dontMedian / doMedian;
    if (factor >= 2) {
      return `${factor.toFixed(1)}× faster`;
    }
    const saved = dontMedian - doMedian;
    return `${saved.toFixed(0)} ms saved (${((1 - 1 / factor) * 100).toFixed(0)}% faster)`;
  }

  barWidth(durationMs: number): number {
    const max = Math.max(this.median(this.doState) ?? 0, this.median(this.dontState) ?? 0);
    if (max <= 0) {
      return 0;
    }
    return Math.max(8, (durationMs / max) * 100);
  }

  onCodeChange(side: 'do' | 'dont', newCode: string) {
    const state = side === 'do' ? this.doState : this.dontState;
    state.code = newCode;
    state.editorHeight = this.calculateHeight(newCode);
  }

  async runSingle(side: 'do' | 'dont') {
    const state = side === 'do' ? this.doState : this.dontState;
    state.samples = [];
    this.phase = 'idle';
    const ms = await this.execute(side);
    if (ms !== null) {
      state.samples = [ms];
    }
    this.cdr.detectChanges();
  }

  async runBoth() {
    this.doState.samples = [];
    this.dontState.samples = [];

    if (!this.timed) {
      await this.execute('dont');
      await this.execute('do');
      this.cdr.detectChanges();
      return;
    }

    // 1. Warm-up, discarded. The first execution of either side pays for loading
    // the model into memory; without this, whichever side ran first would carry
    // a multi-second penalty that has nothing to do with the practice.
    this.phase = 'warmup';
    this.repIndex = 0;
    this.cdr.detectChanges();
    await this.execute('dont');
    await this.execute('do');

    // 2. Measured samples in alternating order, so any residual drift (thermal
    // throttling, background load) is shared evenly rather than charged to one side.
    this.phase = 'measuring';
    const orders: ('do' | 'dont')[][] = [
      ['do', 'dont'],
      ['dont', 'do'],
      ['do', 'dont'],
    ];
    for (let i = 0; i < this.REPETITIONS; i++) {
      this.repIndex = i + 1;
      for (const side of orders[i % orders.length]) {
        const ms = await this.execute(side);
        if (ms !== null) {
          (side === 'do' ? this.doState : this.dontState).samples.push(ms);
        }
        this.cdr.detectChanges();
      }
    }

    this.phase = 'done';
    this.cdr.detectChanges();
  }

  /** Runs one side once and returns its duration, or null if it threw. */
  private async execute(side: 'do' | 'dont'): Promise<number | null> {
    const state = side === 'do' ? this.doState : this.dontState;
    state.running = true;
    state.output = 'Executing…';
    this.cdr.detectChanges();

    const outputBuffer: string[] = [];
    const customConsole = {
      log: (...args: any[]) => {
        outputBuffer.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
      },
      error: (...args: any[]) => {
        outputBuffer.push('Error: ' + args.join(' '));
      },
      warn: (...args: any[]) => {
        outputBuffer.push('Warning: ' + args.join(' '));
      },
    };

    // Snippets call reportTiming(ms) to time exactly the region the lesson is
    // about, excluding setup both sides share (session creation, model load).
    let reportedMs: number | null = null;
    const reportTiming = (ms: number) => {
      reportedMs = Number(ms);
    };

    const start = performance.now();
    let failed = false;
    try {
      // Same execution strategy as CodeSnippetComponent: an async IIFE built with the
      // native parser so top-level await works regardless of TypeScript downleveling.
      const wrapperCode = `
        return (async () => {
          const console = customConsole;
          const { LanguageModel, Translator, LanguageDetector, Summarizer,
                  Writer, Rewriter, Proofreader, SemanticEmbedder } = window;

          ${state.code}
        })();
      `;
      const fn = new Function('customConsole', 'reportTiming', wrapperCode);
      await fn(customConsole, reportTiming);

      if (outputBuffer.length === 0) {
        outputBuffer.push('Execution completed with no output.');
      }
    } catch (err: any) {
      failed = true;
      outputBuffer.push('Exception: ' + (err.message || String(err)));
    }

    const wallMs = performance.now() - start;
    state.reported = reportedMs !== null;
    state.output = outputBuffer.join('\n');
    state.running = false;
    this.cdr.detectChanges();

    if (failed) {
      return null;
    }
    return reportedMs !== null ? reportedMs : wallMs;
  }
}
