import { Component } from '@angular/core';

@Component({
  selector: 'app-docs-home',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      
      <!-- Hero Section -->
      <div class="relative py-20 px-6 overflow-hidden border-b border-slate-200 dark:border-zinc-800">
        <div class="absolute inset-0 bg-gradient-to-b from-slate-50 to-[#ffffff] dark:from-[#18181b] dark:to-[#121212] z-0"></div>
        
        <!-- Subtle Glow -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full pointer-events-none z-0"></div>

        <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#ffffff] dark:bg-[#161616] text-indigo-600 dark:text-indigo-400 mb-8 shadow-xl border border-slate-200/60 dark:border-zinc-700/60">
            <i class="bi bi-cpu text-4xl"></i>
          </div>
          
          <h1 class="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 leading-tight">
            Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">WebAI Studio</span>
          </h1>
          
          <p class="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed mb-10">
            WebAI Studio is the premier developer environment and prototyping playground for <strong>Chrome's Built-in AI APIs</strong>. It empowers you to build, test, and benchmark entirely local, on-device AI capabilities directly within the browser—zero API keys, zero cloud costs, and infinite scalability.
          </p>

          <div class="flex flex-col sm:flex-row items-center gap-4">
            <a routerLink="/docs/get-started" class="!no-underline px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
              <i class="bi bi-rocket-takeoff"></i> Get Started
            </a>
            <a routerLink="/demos" class="!no-underline px-8 py-3.5 bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 font-semibold rounded-full border border-slate-200 dark:border-zinc-700 shadow-sm transition-all duration-200 flex items-center gap-2">
              <i class="bi bi-play-circle"></i> View Demos
            </a>
          </div>
        </div>
      </div>

      <div class="max-w-5xl mx-auto w-full p-6 md:p-12 pb-32 font-sans relative z-10">

        <!-- Getting Started Cards -->
        <div class="mb-20">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
              <i class="bi bi-compass"></i>
            </div>
            Core Concepts
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a routerLink="/docs/get-started" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400 transition-colors">
                <i class="bi bi-book"></i>
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Implementation Guide</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Learn the prerequisites, Origin Trials, and the standard implementation lifecycle for instantiating and running on-device models.
              </p>
            </a>
            <a routerLink="/docs/check-availability" class="!no-underline group block p-8 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400 transition-colors">
                <i class="bi bi-download"></i>
              </div>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Model Management</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Understand how to check hardware support, trigger model weight downloads, and track network progress interactively.
              </p>
            </a>
          </div>
        </div>

        <!-- API Reference -->
        <div class="mb-20">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">
              <i class="bi bi-braces-asterisk"></i>
            </div>
            API Reference
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Prompt API -->
            <a routerLink="/docs/prompt-api" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-pink-300 dark:hover:border-pink-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-pink-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-terminal"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Prompt API</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">LanguageModel</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                The core instruction-tuned model for zero-shot, n-shot, tools, and custom tasks.
              </p>
            </a>

            <!-- Summarizer -->
            <a routerLink="/docs/summarizer" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-card-text"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Summarizer</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">Summarizer</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                Condense long articles, meetings, or logs into structured key points or TL;DRs.
              </p>
            </a>

            <!-- Writer -->
            <a routerLink="/docs/writer" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-pencil"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Writer</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">Writer</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                Generate net-new content like emails, posts, or articles from scratch.
              </p>
            </a>

            <!-- Rewriter -->
            <a routerLink="/docs/rewriter" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-cursor-text"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Rewriter</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">Rewriter</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                Adjust tone, change length, or beautifully refine existing text blocks.
              </p>
            </a>

            <!-- Translator -->
            <a routerLink="/docs/translator" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-teal-300 dark:hover:border-teal-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-teal-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-translate"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Translator</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">Translator</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                Real-time, offline translation utilizing specialized dynamic language packs.
              </p>
            </a>

            <!-- Language Detector -->
            <a routerLink="/docs/language-detector" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-teal-300 dark:hover:border-teal-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-teal-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-globe"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Language Detector</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">LanguageDetector</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                Identify the language of arbitrary text rapidly with confidence scoring.
              </p>
            </a>

            <!-- Proofreader -->
            <a routerLink="/docs/proofreader" class="!no-underline group relative p-6 rounded-3xl bg-[#ffffff] dark:bg-[#161616] border border-slate-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full md:col-span-2 lg:col-span-1">
              <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                <i class="bi bi-arrow-right"></i>
              </div>
              <div class="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-2xl mb-5">
                <i class="bi bi-spellcheck"></i>
              </div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-2 tracking-tight">Proofreader</h3>
              <code class="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded w-fit mb-4 border border-slate-200 dark:border-zinc-700">Proofreader</code>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-auto font-medium">
                Deep syntactic analysis to natively find and correct grammar and spelling errors.
              </p>
            </a>
          </div>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class DocsHomePage {}
