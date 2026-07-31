import { Component } from '@angular/core';

@Component({
  selector: 'app-best-practices',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <!-- Hero -->
      <div class="relative py-16 px-6 overflow-hidden border-b border-slate-200 dark:border-zinc-800">
        <div class="absolute inset-0 bg-gradient-to-b from-slate-50 to-[#ffffff] dark:from-[#18181b] dark:to-[#121212] z-0"></div>
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full pointer-events-none z-0"></div>

        <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ffffff] dark:bg-[#161616] text-emerald-600 dark:text-emerald-400 mb-6 shadow-xl border border-slate-200/60 dark:border-zinc-700/60">
            <i class="bi bi-patch-check text-3xl"></i>
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-5">
            Built-in AI <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Best Practices</span>
          </h1>
          <p class="text-lg text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed mb-4">
            Going from a demo to a production feature is where most built-in AI implementations fall apart. This guide covers the patterns that matter — session lifecycle, latency, safe rendering, structured output, and UX — and lets you <strong>run the "do" and the "don't" side by side</strong> to see the code, the output, and the timing difference for yourself.
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500">
            Based on
            <a href="https://developer.chrome.com/docs/ai/built-in-ai-dos-donts" target="_blank" class="text-emerald-600 dark:text-emerald-400 hover:underline">Built-in AI APIs: do and don't</a>
            from the Chrome team (CC BY 4.0).
          </p>
        </div>
      </div>

      <div class="max-w-5xl mx-auto w-full p-6 md:p-12 pb-32 font-sans relative z-10">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- Session Management -->
          <a routerLink="/best-practices/session-management" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-6">
              <i class="bi bi-diagram-2"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Session Management</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Pre-warm the model on user intent, set system instructions at creation, clone sessions instead of recreating them, and destroy what you no longer need.
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Pre-warming</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">initialPrompts</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">clone()</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">destroy()</span>
            </div>
          </a>

          <!-- Performance -->
          <a routerLink="/best-practices/performance" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl mb-6">
              <i class="bi bi-lightning-charge"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Performance</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Latency scales with input size. Strip markup and noise before prompting, and cache results locally so repeated queries never touch the model twice.
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Input hygiene</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Caching</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">TTL</span>
            </div>
          </a>

          <!-- Streaming & Rendering -->
          <a routerLink="/best-practices/streaming" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-sky-300 dark:hover:border-sky-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl mb-6">
              <i class="bi bi-broadcast"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Streaming &amp; Rendering</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Stream for perceived speed, but treat every chunk as untrusted output: sanitize the combined result, never innerHTML on each update.
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Time to first token</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Sanitizer</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Markdown</span>
            </div>
          </a>

          <!-- Structured Output -->
          <a routerLink="/best-practices/structured-output" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div class="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl mb-6">
              <i class="bi bi-braces"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Structured Output</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Constrain responses with a JSON Schema instead of begging for JSON in prose, and never encode UI length limits into the schema.
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">responseConstraint</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">JSON Schema</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Length limits</span>
            </div>
          </a>

          <!-- UX Patterns -->
          <a routerLink="/best-practices/user-experience" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-pink-300 dark:hover:border-pink-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 md:col-span-2">
            <div class="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl mb-6">
              <i class="bi bi-stars"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">UX Patterns for AI Features</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Keep users informed while the model works, align response timing with their mental model of the task, make every AI edit navigable and undoable, and always leave the user as the final editor.
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Progress indicators</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Perceived time</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">Undo &amp; versions</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">User control</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' },
})
export class BestPracticesPage {}
