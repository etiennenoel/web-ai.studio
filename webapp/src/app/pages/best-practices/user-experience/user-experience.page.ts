import { Component } from '@angular/core';

@Component({
  selector: 'app-best-practices-user-experience',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">

        <!-- Header -->
        <div class="mb-10 max-w-4xl">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/best-practices" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Best Practices</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">UX Patterns</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">UX Patterns for AI Features</h1>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Technically correct inference with a bad experience is still a bad feature. These four patterns cover how users perceive AI work: what they see while it runs, how fast it should <em>feel</em>, and who stays in control of the result.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- 1. Keep the user informed -->
        <div class="mb-16 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Keep the user informed</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Match the feedback mechanism to the task's duration and shape — never update the UI without a visual cue.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#161616]">
              <i class="bi bi-text-left text-sky-500 text-xl"></i>
              <h4 class="font-bold text-sm text-slate-900 dark:text-white mt-3 mb-1.5">Stream long content</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">Summaries and chat get a per-token typewriter effect — the user reads while the model writes.</p>
            </div>
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#161616]">
              <i class="bi bi-hourglass-split text-amber-500 text-xl"></i>
              <h4 class="font-bold text-sm text-slate-900 dark:text-white mt-3 mb-1.5">Spinner for short tasks</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">Alt-text or labels arrive in one polished piece; a brief indicator plus speculative prep of the next task works best.</p>
            </div>
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#161616]">
              <i class="bi bi-magic text-violet-500 text-xl"></i>
              <h4 class="font-bold text-sm text-slate-900 dark:text-white mt-3 mb-1.5">Transitions for edits</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">Translation and rewriting benefit from word-morphing or crossfade animations that show <em>what changed</em>.</p>
            </div>
          </div>
        </div>

        <!-- 2. Mental model of time -->
        <div class="mb-16 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Align with the user's mental model of time</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
            Paradoxically, users can find results <em>more trustworthy</em> when the generation time matches their perceived difficulty of the task. If a "deep analysis" completes in 80&nbsp;ms, it reads as fake. A brief, honest processing animation — even an artificial one- or two-second delay for near-instant results — can improve trust.
          </p>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            <strong class="text-red-600 dark:text-red-400">Don't:</strong> surprise users by instantly replacing UI with generated content and no cue that anything happened.
          </p>

          <!-- Live demo -->
          <div class="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#161616] overflow-hidden">
            <div class="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#1e1e1e] flex items-center gap-2.5">
              <i class="bi bi-ui-checks-grid text-indigo-500 dark:text-indigo-400"></i>
              <span class="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400">Feel the difference</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
              <div class="p-5">
                <div class="flex items-center gap-2 mb-3">
                  <i class="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 text-sm"></i>
                  <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Paced result</span>
                </div>
                <button (click)="runPaced()" [disabled]="pacedState === 'working'"
                        class="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors m-0 mb-3">
                  Analyze sentiment
                </button>
                <div class="min-h-[52px] p-3 rounded-lg bg-[#ffffff] dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-700 dark:text-slate-300">
                  @if (pacedState === 'working') {
                    <span class="flex items-center gap-2 text-slate-500 dark:text-slate-400"><span class="inline-block w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin"></span> Analyzing your text…</span>
                  } @else if (pacedState === 'done') {
                    <span>Sentiment: <strong>Positive</strong> (0.92) — the pause and spinner made this feel like real analysis.</span>
                  } @else {
                    <span class="text-slate-400 dark:text-slate-500">Result appears here…</span>
                  }
                </div>
              </div>
              <div class="p-5">
                <div class="flex items-center gap-2 mb-3">
                  <i class="bi bi-x-circle-fill text-red-600 dark:text-red-400 text-sm"></i>
                  <span class="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Instant swap</span>
                </div>
                <button (click)="runInstant()"
                        class="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors m-0 mb-3">
                  Analyze sentiment
                </button>
                <div class="min-h-[52px] p-3 rounded-lg bg-[#ffffff] dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-700 dark:text-slate-300">
                  @if (instantDone) {
                    <span>Sentiment: <strong>Positive</strong> (0.92) — it flashed in with zero cues. Did it even run? Would you trust it?</span>
                  } @else {
                    <span class="text-slate-400 dark:text-slate-500">Result appears here…</span>
                  }
                </div>
              </div>
            </div>
          </div>
          <app-code-snippet [code]="pacingCode" [runnable]="false"></app-code-snippet>
        </div>

        <!-- 3. Navigate and undo -->
        <div class="mb-16 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Let users navigate and undo AI edits</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
            Generation is exploratory: users want to compare attempts and go back. Keep every version reachable with a stepper or history — <strong class="text-red-600 dark:text-red-400">never</strong> overwrite a draft the user might have liked with no way to compare or revert. Think "Reject/Accept" suggestions in Google Docs or "Undo all edits" in agent tooling.
          </p>

          <!-- Live stepper demo -->
          <div class="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#161616] overflow-hidden">
            <div class="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-[#ffffff] dark:bg-[#1e1e1e] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <i class="bi bi-ui-checks-grid text-indigo-500 dark:text-indigo-400"></i>
                <span class="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400">Version stepper — try it</span>
              </div>
              <button (click)="regenerate()" class="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 transition-colors m-0">
                <i class="bi bi-arrow-clockwise"></i> Regenerate
              </button>
            </div>
            <div class="p-5">
              <div class="p-4 rounded-lg bg-[#ffffff] dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-700 dark:text-slate-300 mb-3 min-h-[56px]">
                {{ versions[versionIndex] }}
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button (click)="stepVersion(-1)" [disabled]="versionIndex === 0"
                          class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors m-0">
                    <i class="bi bi-chevron-left text-xs"></i>
                  </button>
                  <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ versionIndex + 1 }} / {{ versions.length }}</span>
                  <button (click)="stepVersion(1)" [disabled]="versionIndex === versions.length - 1"
                          class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors m-0">
                    <i class="bi bi-chevron-right text-xs"></i>
                  </button>
                </div>
                <span class="text-[11px] text-slate-400 dark:text-slate-500">Every attempt stays reachable — nothing is ever lost.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. User control -->
        <div class="mb-16 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Empower user control and overrides</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            The APIs will sometimes produce results that are incorrect or just not what the user wanted. The user must always be the <em>final editor</em>: generated content lands in an editable surface, overrides are one click away, and the AI result is never the only option. If the model writes alt-text, the user can rewrite it. If it fills a form, the user can clear it.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
              <div class="flex items-center gap-2 mb-2">
                <i class="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 text-sm"></i>
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Do</span>
              </div>
              <ul class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5 pl-4 m-0">
                <li>Render results into editable inputs, not read-only labels.</li>
                <li>Offer accept / reject / edit on every suggestion.</li>
                <li>Keep the user's original content recoverable.</li>
              </ul>
            </div>
            <div class="p-5 rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
              <div class="flex items-center gap-2 mb-2">
                <i class="bi bi-x-circle-fill text-red-600 dark:text-red-400 text-sm"></i>
                <span class="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Don't</span>
              </div>
              <ul class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5 pl-4 m-0">
                <li>Auto-apply generated content with no confirmation.</li>
                <li>Force the AI result as the only path forward.</li>
                <li>Hide or discard what the user wrote themselves.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/best-practices/structured-output" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Structured Output</span>
          </a>
          <a routerLink="/best-practices" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Back to <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Best Practices Home</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' },
})
export class UserExperiencePage {
  pacedState: 'idle' | 'working' | 'done' = 'idle';
  instantDone = false;

  versionIndex = 0;
  versions: string[] = [
    'On-device AI keeps user data local while delivering instant, offline-capable intelligence.',
  ];

  private readonly regenerationPool = [
    'Built-in AI APIs bring private, zero-latency intelligence straight into the browser.',
    'Run models where the data lives: on the device, with no keys, costs, or round-trips.',
    'Local inference means your users get AI features that work offline and stay private.',
    'The browser ships the model, you ship the feature — no cloud bill attached.',
  ];

  pacingCode = `// Near-instant results can feel untrustworthy. A short, honest pause
// with a processing cue aligns the feature with the user's expectations.
const MIN_PERCEIVED_MS = 1200;

showSpinner('Analyzing your text…');
const start = performance.now();
const result = await session.prompt(analysisPrompt);

const elapsed = performance.now() - start;
if (elapsed < MIN_PERCEIVED_MS) {
  await new Promise(r => setTimeout(r, MIN_PERCEIVED_MS - elapsed));
}
hideSpinner();
revealWithAnimation(result);`;

  runPaced() {
    this.pacedState = 'working';
    setTimeout(() => {
      this.pacedState = 'done';
    }, 1300);
  }

  runInstant() {
    this.instantDone = false;
    // Force a re-render so repeated clicks still "flash" the result in.
    setTimeout(() => (this.instantDone = true));
  }

  regenerate() {
    const next = this.regenerationPool[(this.versions.length - 1) % this.regenerationPool.length];
    this.versions = [...this.versions, next];
    this.versionIndex = this.versions.length - 1;
  }

  stepVersion(delta: number) {
    this.versionIndex = Math.min(this.versions.length - 1, Math.max(0, this.versionIndex + delta));
  }
}
