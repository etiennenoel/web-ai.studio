import { Component, ChangeDetectorRef, Inject, Input, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type PracticeMockScenario = 'prewarm' | 'clone' | 'input-hygiene' | 'cache' | 'streaming' | 'schema';

/**
 * Animated side-by-side mock UIs illustrating a "do" and a "don't" pattern.
 * A single wall-clock loop drives both panels so the user can see the same
 * user journey play out under each implementation, including where the time goes.
 */
@Component({
  selector: 'app-practice-mock',
  template: `
    <div class="my-8 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#161616] overflow-hidden shadow-sm select-none">
      <!-- Header -->
      <div class="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#1e1e1e]">
        <div class="flex items-center gap-2.5">
          <i class="bi bi-film text-indigo-500 dark:text-indigo-400"></i>
          <span class="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400">Watch the difference</span>
        </div>
        <span class="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{{ elapsedLabel }}</span>
      </div>
      <!-- Loop progress -->
      <div class="h-0.5 bg-slate-100 dark:bg-zinc-800">
        <div class="h-full bg-indigo-400/70 dark:bg-indigo-500/70" [style.width.%]="progress * 100"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
        @for (side of sides; track side) {
          <div class="p-4 sm:p-5">
            <!-- Side label -->
            <div class="flex items-center gap-2 mb-3">
              <i class="bi text-sm" [ngClass]="side === 'do' ? 'bi-check-circle-fill text-emerald-600 dark:text-emerald-400' : 'bi-x-circle-fill text-red-600 dark:text-red-400'"></i>
              <span class="text-xs font-bold uppercase tracking-wider" [ngClass]="side === 'do' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'">
                {{ side === 'do' ? doCaption : dontCaption }}
              </span>
            </div>

            <!-- Mock app window -->
            <div class="rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-[#ffffff] dark:bg-zinc-900 overflow-hidden shadow-sm">
              <div class="px-3 py-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80">
                <span class="w-2 h-2 rounded-full bg-red-300 dark:bg-red-400/50"></span>
                <span class="w-2 h-2 rounded-full bg-amber-300 dark:bg-amber-400/50"></span>
                <span class="w-2 h-2 rounded-full bg-emerald-300 dark:bg-emerald-400/50"></span>
              </div>
              <div class="p-4 min-h-[210px] text-[12px]">

                @switch (scenario) {

                  <!-- ============ PRE-WARM ============ -->
                  @case ('prewarm') {
                    <!-- Intent + background load (do side only) -->
                    <div class="h-6 mb-2">
                      @if (side === 'do' && on(0.5, 10)) {
                        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                          <i class="bi bi-stars"></i>
                          @if (on(0.5, 3)) { Intent detected — pre-warming model } @else { Model ready }
                          @if (on(3, 10)) { <i class="bi bi-check2"></i> }
                        </div>
                      }
                    </div>
                    @if (side === 'do') {
                      <div class="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 mb-3 overflow-hidden">
                        <div class="h-full rounded-full bg-indigo-400 dark:bg-indigo-500 transition-[width] duration-150 ease-linear" [style.width.%]="frac(0.5, 3) * 100"></div>
                      </div>
                    } @else {
                      <div class="h-1.5 mb-3"></div>
                    }

                    <!-- User typing their task -->
                    <div class="rounded-lg border border-slate-200 dark:border-zinc-700 p-2.5 mb-3">
                      <div class="text-[10px] text-slate-400 dark:text-zinc-500 mb-1.5">User writes the text to summarize…</div>
                      <div class="space-y-1.5">
                        <div class="h-2 rounded bg-slate-200 dark:bg-zinc-700 transition-[width] duration-150 ease-linear" [style.width.%]="20 + 75 * frac(1, 4)"></div>
                        <div class="h-2 rounded bg-slate-200 dark:bg-zinc-700 transition-[width] duration-150 ease-linear" [style.width.%]="10 + 70 * frac(1.8, 4)"></div>
                        <div class="h-2 rounded bg-slate-200 dark:bg-zinc-700 transition-[width] duration-150 ease-linear" [style.width.%]="45 * frac(2.6, 4)"></div>
                      </div>
                    </div>

                    <!-- Generate button -->
                    <div class="mb-3">
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all duration-200"
                            [ngClass]="on(4.4, 4.9) ? 'bg-indigo-600 text-white scale-105 shadow-md' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'">
                        <i class="bi bi-magic"></i> Generate @if (on(4.4, 4.9)) { — clicked! }
                      </span>
                    </div>

                    <!-- Result / waiting -->
                    <div class="rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 p-2.5 min-h-[52px]">
                      @if (side === 'do') {
                        <span class="text-slate-700 dark:text-slate-300">{{ typedWords(prewarmResult, 4.7, 5.5) }}</span>
                      } @else {
                        @if (on(4.5, 8.2)) {
                          <span class="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                            <span class="inline-block w-3 h-3 border-2 border-slate-300 dark:border-zinc-600 border-t-indigo-500 rounded-full animate-spin"></span>
                            @if (on(4.5, 7)) { Loading model… } @else { Generating… }
                          </span>
                        } @else if (on(8.2, 10)) {
                          <span class="text-slate-700 dark:text-slate-300">{{ prewarmResult }}</span>
                        }
                      }
                    </div>
                    <div class="h-7 mt-2.5">
                      @if (side === 'do' && on(6.4, 10)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold"><i class="bi bi-stopwatch"></i> User waited ~0.3 s</span>
                      }
                      @if (side === 'dont' && on(8.6, 10)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold"><i class="bi bi-stopwatch"></i> User waited ~3.7 s</span>
                      }
                    </div>
                  }

                  <!-- ============ CLONE ============ -->
                  @case ('clone') {
                    @if (side === 'do') {
                      <div class="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-2.5 mb-3" [style.opacity]="on(0.4, 11) ? 1 : 0">
                        <div class="flex items-center gap-2 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                          <i class="bi bi-cpu"></i> Base session
                        </div>
                        <div class="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                          @if (on(0.4, 1.6)) { parsing system prompt… } @else { system prompt parsed <i class="bi bi-check2"></i> — parsed once, reused forever }
                        </div>
                        <div class="h-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 mt-1.5 overflow-hidden">
                          <div class="h-full bg-indigo-400 dark:bg-indigo-500 transition-[width] duration-150 ease-linear" [style.width.%]="frac(0.4, 1.6) * 100"></div>
                        </div>
                      </div>
                    } @else {
                      <div class="rounded-lg border border-dashed border-slate-200 dark:border-zinc-700 p-2.5 mb-3 text-[10px] text-slate-400 dark:text-zinc-500">
                        No base session — every task starts from zero.
                      </div>
                    }

                    <!-- Each side is a sequential pipeline: a task starts when the
                         previous one finishes, so the clone side pulls ahead task by task. -->
                    @for (task of cloneTasks; track task.label) {
                      @let s = side === 'do' ? task.doStart : task.dontStart;
                      <div class="mb-2.5" [style.opacity]="on(s, 11) ? 1 : 0.25">
                        <div class="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 mb-1">
                          <span class="font-semibold">{{ task.label }}</span>
                          @if (side === 'do') {
                            @if (on(s, s + 0.3)) { <span class="px-1.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[9px] font-mono font-bold">clone()</span> }
                            @if (on(s + 1.5, 11)) { <i class="bi bi-check-circle-fill text-emerald-500 text-[11px]"></i> }
                          } @else {
                            @if (on(s, s + 1.5)) { <span class="px-1.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 text-[9px] font-mono font-bold">create() + re-parse instructions</span> }
                            @if (on(s + 2.5, 11)) { <i class="bi bi-check-circle-fill text-emerald-500 text-[11px]"></i> }
                          }
                        </div>
                        <div class="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex">
                          <!-- Inference (green) is identical on both sides — only the
                               setup cost (red) differs. Bar lengths are time-proportional. -->
                          @if (side === 'do') {
                            <div class="h-full bg-emerald-400 dark:bg-emerald-500 transition-[width] duration-150 ease-linear" [style.width.%]="48 * frac(s + 0.3, s + 1.5)"></div>
                          } @else {
                            <div class="h-full bg-red-400 dark:bg-red-500/80 transition-[width] duration-150 ease-linear" [style.width.%]="52 * frac(s, s + 1.3)"></div>
                            <div class="h-full bg-emerald-400 dark:bg-emerald-500 transition-[width] duration-150 ease-linear" [style.width.%]="48 * frac(s + 1.3, s + 2.5)"></div>
                          }
                        </div>
                      </div>
                    }
                    <div class="h-7 mt-2">
                      @if (side === 'do' && on(7.2, 11)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold"><i class="bi bi-check2-all"></i> All 3 tasks done at ~7 s — instructions parsed once</span>
                      }
                      @if (side === 'dont') {
                        @if (on(7.2, 10.1)) {
                          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold"><i class="bi bi-hourglass-split"></i> Still working…</span>
                        }
                        @if (on(10.1, 11)) {
                          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold"><i class="bi bi-arrow-repeat"></i> Done at ~10 s — instructions re-parsed 3×</span>
                        }
                      }
                    </div>
                  }

                  <!-- ============ INPUT HYGIENE ============ -->
                  @case ('input-hygiene') {
                    <div class="rounded-lg border border-slate-200 dark:border-zinc-700 p-2.5 mb-3 font-mono text-[10px] leading-relaxed overflow-hidden"
                         [ngClass]="side === 'do' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-zinc-500'">
                      @if (side === 'do') {
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-sans font-bold text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">element.innerText</span>
                          <span class="px-1.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">~2,300 chars</span>
                        </div>
                        <div>On-device AI on the web. Built-in AI APIs let websites run inference locally…</div>
                      } @else {
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-sans font-bold text-[9px] uppercase tracking-wider text-red-600 dark:text-red-400">element.innerHTML</span>
                          <span class="px-1.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold">~4,600 chars</span>
                        </div>
                        <div class="whitespace-nowrap">&lt;div class="wrapper" data-analytics-id="a-4821" style="margin:0"&gt;</div>
                        <div class="whitespace-nowrap">&nbsp;&nbsp;&lt;h1 class="title xl:text-4xl font-extrabold"&gt;On-device AI…&lt;/h1&gt;</div>
                        <div class="whitespace-nowrap">&nbsp;&nbsp;&lt;a href="/pricing?utm_source=x&amp;utm_campaign=y"&gt;…&lt;/a&gt;</div>
                      }
                    </div>

                    <div class="flex items-center gap-2 mb-1 text-[10px] text-slate-500 dark:text-zinc-400">
                      <i class="bi bi-arrow-down"></i> tokenize + inference
                      @if (side === 'do' && on(4.6, 8)) { <span class="text-emerald-600 dark:text-emerald-400 font-bold">done in ~2 s</span> }
                      @if (side === 'dont' && on(6.4, 8)) { <span class="text-red-600 dark:text-red-400 font-bold">~3.5 s — same summary</span> }
                    </div>
                    <div class="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden mb-3">
                      @if (side === 'do') {
                        <div class="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-[width] duration-150 ease-linear" [style.width.%]="frac(2, 4.5) * 100"></div>
                      } @else {
                        <div class="h-full rounded-full bg-red-400 dark:bg-red-500/80 transition-[width] duration-150 ease-linear" [style.width.%]="frac(2, 6.4) * 100"></div>
                      }
                    </div>

                    <div class="rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 p-2.5 min-h-[40px] text-slate-700 dark:text-slate-300">
                      @if (side === 'do' && on(4.6, 8)) { <i class="bi bi-card-text text-emerald-500 mr-1"></i> TL;DR: Built-in AI runs privately, on-device. }
                      @if (side === 'dont' && on(6.4, 8)) { <i class="bi bi-card-text text-emerald-500 mr-1"></i> TL;DR: Built-in AI runs privately, on-device. }
                    </div>
                  }

                  <!-- ============ CACHE ============ -->
                  @case ('cache') {
                    <!-- Query 1 -->
                    <div class="mb-3" [style.opacity]="on(0.4, 10) ? 1 : 0.25">
                      <div class="flex items-center justify-between text-[11px] mb-1">
                        <span class="text-slate-600 dark:text-slate-300">“What is WebGPU?” <span class="text-slate-400 dark:text-zinc-500">(1st ask)</span></span>
                        @if (on(4, 10)) {
                          <span class="text-[10px] font-mono text-slate-400 dark:text-zinc-500">3.5 s <i class="bi bi-cpu ml-0.5"></i></span>
                        }
                      </div>
                      <div class="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        <div class="h-full bg-amber-400 dark:bg-amber-500 transition-[width] duration-150 ease-linear" [style.width.%]="frac(0.4, 4) * 100"></div>
                      </div>
                      @if (side === 'do') {
                        <div class="h-5 mt-1">
                          @if (on(4.2, 10)) {
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold"><i class="bi bi-database-add"></i> stored in cache (TTL 1 h)</span>
                          }
                        </div>
                      } @else {
                        <div class="h-5 mt-1"></div>
                      }
                    </div>

                    <!-- Query 2 -->
                    <div class="mb-3" [style.opacity]="on(5.8, 10) ? 1 : 0.25">
                      <div class="flex items-center justify-between text-[11px] mb-1">
                        <span class="text-slate-600 dark:text-slate-300">“What is WebGPU?” <span class="text-slate-400 dark:text-zinc-500">(asked again)</span></span>
                        @if (side === 'do' && on(6.2, 10)) {
                          <span class="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400"><i class="bi bi-lightning-charge-fill"></i> 1 ms</span>
                        }
                        @if (side === 'dont' && on(9.4, 10)) {
                          <span class="text-[10px] font-mono text-red-500 dark:text-red-400">3.5 s <i class="bi bi-cpu ml-0.5"></i></span>
                        }
                      </div>
                      <div class="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        @if (side === 'do') {
                          <div class="h-full bg-emerald-400 dark:bg-emerald-500" [style.width.%]="on(6.1, 10) ? 100 : 0"></div>
                        } @else {
                          <div class="h-full bg-red-400 dark:bg-red-500/80 transition-[width] duration-150 ease-linear" [style.width.%]="frac(5.9, 9.4) * 100"></div>
                        }
                      </div>
                    </div>

                    <div class="h-7">
                      @if (side === 'do' && on(6.6, 10)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold"><i class="bi bi-lightning-charge"></i> Instant repeat, zero compute</span>
                      }
                      @if (side === 'dont' && on(9.5, 10)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold"><i class="bi bi-battery-half"></i> Same wait, battery spent twice</span>
                      }
                    </div>
                  }

                  <!-- ============ STREAMING ============ -->
                  @case ('streaming') {
                    <!-- User bubble -->
                    <div class="flex justify-end mb-3" [style.opacity]="on(0.3, 9) ? 1 : 0">
                      <div class="max-w-[85%] px-3 py-1.5 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-[11px]">
                        Why run AI on-device?
                      </div>
                    </div>
                    <!-- Assistant bubble -->
                    <div class="flex mb-3">
                      <div class="max-w-[90%] px-3 py-2 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-[11px] min-h-[60px] min-w-[120px] leading-relaxed">
                        <!-- Generation finishes at 5.5 s on BOTH sides — streaming only
                             changes when the user starts seeing it, not how long it takes. -->
                        @if (side === 'do') {
                          {{ typedWords(streamingAnswer, 1, 5.5) }}@if (on(1, 5.5)) {<span class="inline-block w-1 h-3 bg-indigo-400 ml-0.5 align-middle animate-pulse"></span>}
                        } @else {
                          @if (on(0.8, 5.5)) {
                            <span class="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                              <span class="inline-block w-3 h-3 border-2 border-slate-300 dark:border-zinc-600 border-t-indigo-500 rounded-full animate-spin"></span> Generating…
                            </span>
                          } @else if (on(5.5, 9)) {
                            {{ streamingAnswer }}
                          }
                        }
                      </div>
                    </div>
                    <div class="h-7">
                      @if (side === 'do' && on(1.8, 9)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold"><i class="bi bi-eye"></i> Reading since the 1st second (~20 tokens/s)</span>
                      }
                      @if (side === 'dont' && on(3.5, 9)) {
                        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold"><i class="bi bi-hourglass-split"></i> {{ on(5.5, 9) ? 'Everything arrived at once' : 'Still nothing to read…' }}</span>
                      }
                    </div>
                  }

                  <!-- ============ SCHEMA ============ -->
                  @case ('schema') {
                    <div class="text-[10px] text-slate-400 dark:text-zinc-500 mb-2">
                      prompt: “Is this post about cats?” {{ side === 'do' ? '+ responseConstraint schema' : '+ “reply with ONLY JSON”' }}
                    </div>
                    <!-- prompt() resolves in one piece — structured output cannot stream,
                         so the full response lands at once on both sides. -->
                    <div class="rounded-lg bg-[#1e1e1e] border border-zinc-800 p-2.5 font-mono text-[11px] text-zinc-300 min-h-[84px] whitespace-pre-wrap leading-relaxed mb-3">@if (schemaGenerating(side)) {<span class="text-zinc-500 animate-pulse">awaiting session.prompt()…</span>}@if (schemaResolved(side)) {<span>{{ side === 'do' ? schemaDoOutput : schemaDontOutput }}</span>}</div>
                    <div class="h-9">
                      @if (side === 'do' && on(4.2, 8)) {
                        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold font-mono">
                          <i class="bi bi-check-circle-fill"></i> JSON.parse() → {{ '{' }} isTopicCats: true {{ '}' }}
                        </div>
                      }
                      @if (side === 'dont' && on(5.8, 8)) {
                        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] font-bold font-mono" [ngClass]="on(5.8, 6.2) ? 'animate-pulse' : ''">
                          <i class="bi bi-x-circle-fill"></i> JSON.parse() ✗ SyntaxError: Unexpected token 'S'
                        </div>
                      }
                    </div>
                  }
                }

              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  standalone: false,
})
export class PracticeMockComponent implements OnInit, OnDestroy {
  @Input() scenario: PracticeMockScenario = 'prewarm';
  @Input() doCaption: string = 'Do';
  @Input() dontCaption: string = "Don't";

  readonly sides: ('do' | 'dont')[] = ['do', 'dont'];

  readonly prewarmResult = 'TL;DR: on-device AI is private, fast, and free to call.';
  // Long enough that streaming it at a realistic ~20-30 tokens/s (~14 words/s
  // here) still takes a few seconds — the reveal rate must feel like real
  // on-device generation, not an artificially slow typewriter.
  readonly streamingAnswer =
    'Running models on-device keeps user data local, works offline, and removes per-call costs — the network round-trip disappears entirely. Latency becomes a hardware property instead of a network one, so features like live translation, smart replies, and summarization stay responsive even on a plane. And because nothing ever leaves the device, privacy-sensitive use cases that could never ship through a cloud API suddenly become possible.';
  readonly schemaDoOutput = '{"isTopicCats": true}';
  readonly schemaDontOutput = 'Sure! Here is the JSON you asked for:\n```json\n{"isTopicCats": true}\n```\nLet me know if you need anything else!';
  // do: clone (0.3 s) + inference (1.2 s) per task; dont: create/re-parse (1.5 s)
  // + inference (1 s) per task. Each start = previous side-local finish + 0.2 s.
  readonly cloneTasks = [
    { label: 'Task 1 — review draft', doStart: 2, dontStart: 2 },
    { label: 'Task 2 — review draft', doStart: 3.7, dontStart: 4.7 },
    { label: 'Task 3 — review draft', doStart: 5.4, dontStart: 7.4 },
  ];

  progress = 0;

  private startTime = 0;
  private intervalId: any = null;
  private reducedMotion = false;

  private static readonly LOOP_SECONDS: Record<PracticeMockScenario, number> = {
    prewarm: 10,
    clone: 11,
    'input-hygiene': 8,
    cache: 10,
    streaming: 9,
    schema: 8,
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
  ) {}

  get loopSeconds(): number {
    return PracticeMockComponent.LOOP_SECONDS[this.scenario];
  }

  get elapsedSeconds(): number {
    return this.progress * this.loopSeconds;
  }

  get elapsedLabel(): string {
    return this.elapsedSeconds.toFixed(1) + ' s / ' + this.loopSeconds + ' s loop';
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion) {
      // Freeze on the end state so the outcome is still visible without motion.
      this.progress = 0.99;
      return;
    }
    this.startTime = performance.now();
    this.intervalId = setInterval(() => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      this.progress = (elapsed % this.loopSeconds) / this.loopSeconds;
      this.cdr.markForCheck();
    }, 80);
  }

  ngOnDestroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  /** True while the loop clock is between startS and endS (seconds). */
  on(startS: number, endS: number): boolean {
    const t = this.elapsedSeconds;
    return t >= startS && t < endS;
  }

  /** 0..1 progression between startS and endS, clamped. */
  frac(startS: number, endS: number): number {
    const t = this.elapsedSeconds;
    if (t <= startS) return 0;
    if (t >= endS) return 1;
    return (t - startS) / (endS - startS);
  }

  /** Substring of text revealed progressively between startS and endS. */
  typed(text: string, startS: number, endS: number): string {
    return text.slice(0, Math.round(text.length * this.frac(startS, endS)));
  }

  /** The schema mock's prompt() is in flight (do resolves at 3.2 s, dont at 4.8 s). */
  schemaGenerating(side: 'do' | 'dont'): boolean {
    return side === 'do' ? this.on(1, 3.2) : this.on(1, 4.8);
  }

  /** The schema mock's full response has landed — all at once, never streamed. */
  schemaResolved(side: 'do' | 'dont'): boolean {
    return side === 'do' ? this.on(3.2, 8) : this.on(4.8, 8);
  }

  /**
   * Word-by-word reveal between startS and endS — models stream tokens
   * (word-sized chunks), not characters, so streamed output must appear
   * word by word to be truthful.
   */
  typedWords(text: string, startS: number, endS: number): string {
    const words = text.split(' ');
    const shown = Math.round(words.length * this.frac(startS, endS));
    return words.slice(0, shown).join(' ');
  }
}
