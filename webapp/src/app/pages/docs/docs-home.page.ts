import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-home',
  template: `
    <div class="h-full overflow-y-auto bg-white dark:bg-[#121212] transition-colors duration-200">
      <div class="max-w-5xl mx-auto w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-12 mt-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-6 shadow-sm border border-indigo-100 dark:border-indigo-500/20">
            <i class="bi bi-journal-code text-3xl"></i>
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            WebAI Studio <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Documentation</span>
          </h1>
          <p class="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Everything you need to build next-generation, on-device AI web applications using Chrome's Built-in AI APIs.
          </p>
        </div>

        <!-- Getting Started Cards -->
        <div class="mb-16">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <i class="bi bi-rocket-takeoff text-indigo-500"></i> Essentials
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a routerLink="/docs/get-started" class="!no-underline group block p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Getting Started</h3>
              <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Learn the core concepts, prerequisites, and the standard implementation lifecycle for all on-device APIs.
              </p>
            </a>
            <a routerLink="/docs/check-availability" class="!no-underline group block p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Check Availability</h3>
              <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Understand how to check device support, manage model weights, and monitor download progress.
              </p>
            </a>
          </div>
        </div>

        <!-- API Reference -->
        <div class="mb-16">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <i class="bi bi-code-slash text-indigo-500"></i> API Reference
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Prompt API -->
            <a routerLink="/docs/prompt-api" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-terminal"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Prompt API</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">LanguageModel</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                The core instruction-tuned model for zero-shot, n-shot, and custom instructions.
              </p>
            </a>

            <!-- Summarizer -->
            <a routerLink="/docs/summarizer" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-card-text"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Summarizer</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">Summarizer</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                Condense long articles, meetings, or logs into key points or TL;DRs.
              </p>
            </a>

            <!-- Writer -->
            <a routerLink="/docs/writer" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-pencil"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Writer</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">Writer</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                Generate net-new content like emails, posts, or articles from context.
              </p>
            </a>

            <!-- Rewriter -->
            <a routerLink="/docs/rewriter" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-cursor-text"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Rewriter</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">Rewriter</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                Adjust tone, change length, or refine existing text blocks natively.
              </p>
            </a>

            <!-- Translator -->
            <a routerLink="/docs/translator" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-translate"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Translator</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">Translator</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                Real-time, offline translation utilizing dynamic language packs.
              </p>
            </a>

            <!-- Language Detector -->
            <a routerLink="/docs/language-detector" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-globe"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Language Detector</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">LanguageDetector</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                Identify the language of arbitrary text with confidence scoring.
              </p>
            </a>

            <!-- Proofreader -->
            <a routerLink="/docs/proofreader" class="!no-underline group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all h-full">
              <div class="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl mb-4">
                <i class="bi bi-spellcheck"></i>
              </div>
              <h3 class="font-bold text-slate-900 dark:text-white mb-1">Proofreader</h3>
              <code class="text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded w-fit mb-3">Proofreader</code>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-auto">
                Syntactic analysis to find and correct grammar and spelling errors.
              </p>
            </a>
          </div>
        </div>

        <!-- The Value of On-Device AI -->
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <i class="bi bi-cpu text-indigo-500"></i> The Value of Local AI
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Privacy -->
            <div class="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <div class="text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
                <i class="bi bi-shield-check text-lg opacity-80"></i>
                <h3 class="font-semibold text-sm">Privacy by Design</h3>
              </div>
              <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Process sensitive data locally without network transmission. Essential for E2E encrypted apps, healthcare, and enterprise tools.
              </p>
            </div>
            
            <!-- Zero Cost -->
            <div class="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <div class="text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
                <i class="bi bi-piggy-bank text-lg opacity-80"></i>
                <h3 class="font-semibold text-sm">Zero Inference Cost</h3>
              </div>
              <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Scale your application infinitely without paying for API tokens. Compute is offloaded to the client's GPU/NPU.
              </p>
            </div>
            
            <!-- Low Latency -->
            <div class="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <div class="text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
                <i class="bi bi-lightning-charge text-lg opacity-80"></i>
                <h3 class="font-semibold text-sm">Ultra-Low Latency</h3>
              </div>
              <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Eliminate network roundtrips. Token generation starts instantaneously, enabling real-time, interactive AI experiences.
              </p>
            </div>
            
            <!-- Offline -->
            <div class="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <div class="text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
                <i class="bi bi-wifi-off text-lg opacity-80"></i>
                <h3 class="font-semibold text-sm">Offline Capable</h3>
              </div>
              <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Provide robust AI features regardless of network connectivity. The model persists in the browser cache.
              </p>
            </div>
          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <div></div> <!-- Spacer -->

          <a routerLink="/docs/get-started" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Getting Started</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class DocsHomePage {}
