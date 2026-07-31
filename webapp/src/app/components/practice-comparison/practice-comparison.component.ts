import { Component, ChangeDetectorRef, Input, OnInit } from '@angular/core';

interface ComparisonSideState {
  code: string;
  output: string;
  durationMs: number | null;
  reported: boolean;
  running: boolean;
  editorHeight: string;
}

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
          <button (click)="runBoth()" [disabled]="isAnyRunning"
                  class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-colors m-0">
            @if (isAnyRunning) {
              <span class="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              Running…
            } @else {
              <i class="bi bi-stopwatch"></i>
              Run both & compare
            }
          </button>
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
                @if (state.durationMs !== null) {
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                        [ngClass]="side.key === 'do' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'">
                    {{ state.durationMs | number: '1.0-0' }}<span class="opacity-60 ml-0.5">ms</span>
                  </span>
                }
                @if (runnable) {
                  <button (click)="run(side.key)" [disabled]="isAnyRunning"
                          class="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-200/70 hover:bg-slate-300/70 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-slate-300 disabled:opacity-50 transition-colors m-0">
                    <i class="bi bi-play-fill"></i> Run
                  </button>
                }
              </div>
            </div>

            <!-- Code -->
            <div class="relative w-full flex-grow bg-[#161616]">
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
      @if (doState.durationMs !== null && dontState.durationMs !== null) {
        <div class="px-5 py-4 border-t border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#1e1e1e]">
          <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 mb-3 flex items-center gap-2">
            <i class="bi bi-speedometer2"></i>
            {{ doState.reported || dontState.reported ? 'User-perceived wait (reported by the snippets)' : 'Timing difference (total run time)' }}
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3">
              <span class="w-14 text-right text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">{{ doLabel }}</span>
              <div class="flex-grow h-5 rounded-md bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div class="h-full bg-emerald-500 dark:bg-emerald-500/80 rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                     [style.width.%]="barWidth(doState.durationMs)">
                  <span class="text-[10px] font-mono font-bold text-white whitespace-nowrap">{{ doState.durationMs | number: '1.0-0' }} ms</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-14 text-right text-[11px] font-bold text-red-600 dark:text-red-400 flex-shrink-0">{{ dontLabel }}</span>
              <div class="flex-grow h-5 rounded-md bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div class="h-full bg-red-500 dark:bg-red-500/80 rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                     [style.width.%]="barWidth(dontState.durationMs)">
                  <span class="text-[10px] font-mono font-bold text-white whitespace-nowrap">{{ dontState.durationMs | number: '1.0-0' }} ms</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
            @if (dontState.durationMs > doState.durationMs) {
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ speedupLabel }}</span> — the recommended approach was faster on this run.
            } @else {
              On this run the two approaches were close — timing varies with hardware and model warm-up. Run again or focus on the qualitative difference in the outputs.
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

  doState: ComparisonSideState = { code: '', output: '', durationMs: null, reported: false, running: false, editorHeight: '100px' };
  dontState: ComparisonSideState = { code: '', output: '', durationMs: null, reported: false, running: false, editorHeight: '100px' };

  readonly sides: { key: 'do' | 'dont' }[] = [{ key: 'do' }, { key: 'dont' }];

  constructor(private cdr: ChangeDetectorRef) {}

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

  get speedupLabel(): string {
    if (this.doState.durationMs === null || this.dontState.durationMs === null || this.doState.durationMs <= 0) {
      return '';
    }
    const factor = this.dontState.durationMs / this.doState.durationMs;
    if (factor >= 2) {
      return `${factor.toFixed(1)}× faster`;
    }
    const saved = this.dontState.durationMs - this.doState.durationMs;
    return `${saved.toFixed(0)} ms saved (${((1 - 1 / factor) * 100).toFixed(0)}% faster)`;
  }

  barWidth(durationMs: number): number {
    const max = Math.max(this.doState.durationMs ?? 0, this.dontState.durationMs ?? 0);
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

  async runBoth() {
    // Sequential on purpose: running both at once would contend for the on-device model
    // and skew the timing comparison.
    await this.run('dont');
    await this.run('do');
  }

  async run(side: 'do' | 'dont') {
    const state = side === 'do' ? this.doState : this.dontState;
    state.running = true;
    state.output = 'Executing…';
    state.durationMs = null;
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

    // Snippets can call reportTiming(ms) to drive the comparison bar with a
    // user-perceived duration (e.g. time to first token) instead of the total
    // wall time of the snippet, which includes setup both sides share.
    let reportedMs: number | null = null;
    const reportTiming = (ms: number) => {
      reportedMs = Number(ms);
    };

    const start = performance.now();
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
      outputBuffer.push('Exception: ' + (err.message || String(err)));
    }
    state.reported = reportedMs !== null;
    state.durationMs = reportedMs !== null ? reportedMs : performance.now() - start;
    state.output = outputBuffer.join('\n');
    state.running = false;
    this.cdr.detectChanges();
  }
}
