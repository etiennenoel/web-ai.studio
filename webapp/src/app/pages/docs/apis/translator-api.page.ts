import { Component } from '@angular/core';

@Component({
  selector: 'app-translator-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Translator</span>
          </nav>
          
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl">
                  <i class="bi bi-translate"></i>
                </div>
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Translator API</h1>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">Last updated: March 23, 2026</p>
            
            <div class="flex flex-wrap items-center gap-3">
              <a href="https://github.com/webmachinelearning/translation-api" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-github"></i> W3C Spec
              </a>
              <a href="https://github.com/webmachinelearning/translation-api/issues" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-2">
                <i class="bi bi-bug"></i> File an Issue
              </a>
              
            </div>
          </div>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Translator API exposes the browser's existing language translation abilities to web pages. It allows you to translate user input, arbitrary DOM elements, or offline content in real-time. It operates using dynamic language packs downloaded on-the-fly to minimize initial footprint.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Global Object -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Global Object</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            The API is exposed via the <code class="font-mono text-xs bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">Translator</code> global object.
          </p>
        </div>

        <!-- Methods -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Methods</h2>
          
          <div class="space-y-8">
            
            <!-- availability() -->
            <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div class="bg-slate-50 dark:bg-[#161616]/50 px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 class="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">
                  Translator.availability(<span class="text-slate-500 font-normal">options</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Unlike most APIs, checking the availability of the Translator requires specifying the desired languages, as the browser needs to check if that specific language pack pair is supported.
                </p>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2 uppercase tracking-wider">Options</h4>
                <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li><code>sourceLanguage</code> (string): The BCP 47 language tag of the input (e.g., <code>"en"</code>, <code>"ja"</code>).</li>
                  <li><code>targetLanguage</code> (string): The BCP 47 language tag of the desired output.</li>
                </ul>
              </div>
            </div>

            <!-- create() -->
            <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div class="bg-slate-50 dark:bg-[#161616]/50 px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 class="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">
                  Translator.create(<span class="text-slate-500 font-normal">options</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Initializes a translation session for a specific language pair. Triggers a language pack download if the availability check returned <code>downloadable</code>.
                </p>
                <h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 mb-2 uppercase tracking-wider">Options</h4>
                <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li><code>sourceLanguage</code> (string): Required.</li>
                  <li><code>targetLanguage</code> (string): Required.</li>
                  <li><code>monitor</code> (function): An optional callback that receives a <code>ProgressEvent</code> to track language pack download state.</li>
                </ul>
              </div>
            </div>

            <!-- translate() -->
            <div class="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div class="bg-slate-50 dark:bg-[#161616]/50 px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 class="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">
                  translator.translate(<span class="text-slate-500 font-normal">text</span>)
                </h3>
              </div>
              <div class="p-5">
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Translates the text in a single shot. Returns a Promise that resolves to the fully translated string. A <code>translateStreaming()</code> counterpart is also available.
                </p>
              </div>
            </div>

          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <a routerLink="/docs/rewriter" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Rewriter API</span>
          </a>

          <a routerLink="/docs/language-detector" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Language Detector API</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class TranslatorApiPage {}
