import { Component } from '@angular/core';

@Component({
  selector: 'app-prompt-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-white dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Prompt API</span>
          </nav>
          
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center text-xl">
                  <i class="bi bi-terminal"></i>
                </div>
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Prompt API</h1>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">Last updated: March 23, 2026</p>
            
            <div class="flex flex-wrap items-center gap-3">
              <a href="https://github.com/webmachinelearning/prompt-api" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-github"></i> W3C Spec
              </a>
              <a href="https://github.com/webmachinelearning/prompt-api/issues" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-bug"></i> File an Issue
              </a>
              <a href="https://developer.chrome.com/docs/web-platform/origin-trials" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-rocket-takeoff"></i> Origin Trial
              </a>
            </div>
          </div>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Prompt API allows web developers to interact directly with the browser's underlying instruction-tuned language model. It acts as the Swiss Army knife of on-device AI, giving you access to zero-shot, n-shot, system prompting, structured output constraints, and tool calling.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Global Object -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Global Object</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            The API is exposed via the <code class="font-mono text-xs bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">LanguageModel</code> global object.
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
                  LanguageModel.create(<span class="text-slate-500 font-normal">options?</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Initializes a persistent session with the language model.
                </p>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2 uppercase tracking-wider">Options</h4>
                <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li><code>systemPrompt</code> (string): The overarching instructions governing the model's behavior.</li>
                  <li><code>initialPrompts</code> (array): An array of <code>{{'{'}} role, content {{'}'}}</code> objects to establish conversation history.</li>
                  <li><code>temperature</code> (number): Controls the randomness of the output.</li>
                  <li><code>topK</code> (number): Restricts the pool of tokens the model samples from.</li>
                  <li><code>expectedInputs</code> / <code>expectedOutputs</code>: Declarations used to pre-fetch required language models or multimodal capabilities.</li>
                  <li><code>tools</code> (array): An array of functions the model can invoke.</li>
                </ul>
              </div>
            </div>

            <!-- promptStreaming() -->
            <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div class="bg-slate-50 dark:bg-zinc-900/50 px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 class="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">
                  session.promptStreaming(<span class="text-slate-500 font-normal">input</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Sends an input prompt to the active session and returns a <code>ReadableStream</code> of string chunks as the model generates them.
                </p>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2 uppercase tracking-wider">Input Formats</h4>
                <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li><strong>String:</strong> A simple text prompt.</li>
                  <li><strong>Array:</strong> An array of <code>{{'{'}} role, content {{'}'}}</code> objects, allowing multimodal inputs (e.g., passing image blobs or audio buffers).</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <a routerLink="/docs/check-availability" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Check Availability</span>
          </a>

          <a routerLink="/docs/summarizer" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Summarizer API</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class PromptApiPage {}
