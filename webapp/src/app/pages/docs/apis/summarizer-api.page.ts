import { Component } from '@angular/core';

@Component({
  selector: 'app-summarizer-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-white dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Summarizer</span>
          </nav>
          
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                  <i class="bi bi-card-text"></i>
                </div>
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Summarizer API</h1>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">Last updated: March 23, 2026</p>
            
            <div class="flex flex-wrap items-center gap-3">
              <a href="https://github.com/webmachinelearning/writing-assistance-apis" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-github"></i> W3C Spec
              </a>
              <a href="https://github.com/webmachinelearning/writing-assistance-apis/issues" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-bug"></i> File an Issue
              </a>
              
            </div>
          </div>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Summarizer API is part of the Writing Assistance APIs. It is a high-level abstraction designed specifically to condense long articles, meeting transcripts, or chat logs into concise overviews. It abstracts away the complex prompt engineering required to reliably shorten text while preserving key information.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Global Object -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Global Object</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            The API is exposed via the <code class="font-mono text-xs bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">Summarizer</code> global object.
          </p>
        </div>

        <!-- Methods -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Methods</h2>
          
          <div class="space-y-8">
            
            <!-- create() -->
            <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div class="bg-slate-50 dark:bg-zinc-900/50 px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 class="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">
                  Summarizer.create(<span class="text-slate-500 font-normal">options?</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Initializes a summarizer object tailored to a specific style of output.
                </p>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2 uppercase tracking-wider">Options</h4>
                <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li><code>type</code>: The format of the summary (e.g., <code>"tl;dr"</code>, <code>"key-points"</code>, <code>"teaser"</code>, <code>"headline"</code>).</li>
                  <li><code>format</code>: The structural output (e.g., <code>"plain-text"</code>, <code>"markdown"</code>).</li>
                  <li><code>length</code>: The verbosity (e.g., <code>"short"</code>, <code>"medium"</code>, <code>"long"</code>).</li>
                  <li><code>sharedContext</code>: Context applied to all subsequent summarization requests made by this object.</li>
                </ul>
              </div>
            </div>

            <!-- summarizeStreaming() -->
            <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div class="bg-slate-50 dark:bg-zinc-900/50 px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 class="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">
                  summarizer.summarizeStreaming(<span class="text-slate-500 font-normal">text, options?</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Condenses the provided text and returns a <code>ReadableStream</code> of the output.
                </p>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2 uppercase tracking-wider">Parameters</h4>
                <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li><code>text</code> (string): The raw text to be summarized.</li>
                  <li><code>options.context</code> (string): Ephemeral context specific to this individual summarization request.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <a routerLink="/docs/prompt-api" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Prompt API</span>
          </a>

          <a routerLink="/docs/writer" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Writer API</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class SummarizerApiPage {}
