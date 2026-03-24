import { Component } from '@angular/core';

@Component({
  selector: 'app-proofreader-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Proofreader API</span>
          </nav>
          
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Proofreader API
                </h1>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
            </div>
            
            <div class="flex gap-2">
              <a href="https://github.com/webmachinelearning/proofreader-api" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-github"></i> GitHub Repository
              </a>
              <a href="https://github.com/webmachinelearning/proofreader-api/issues" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-bug"></i> Issues
              </a>
            </div>
          </div>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Proofreader API allows web pages to check for grammar, spelling, and punctuation errors. It goes beyond returning corrected text by providing structured annotations detailing the error type and plain-language explanations of why the correction was made.
          </p>
        </div>

        <div class="h-px w-full bg-slate-200 dark:bg-zinc-800 mb-10 max-w-4xl"></div>

        <!-- Main Content -->
        <div class="space-y-12 max-w-4xl">

          <!-- availability -->
          <section id="availability" class="scroll-mt-6">
            <app-docs-section-header anchorId="availability" title="Proofreader.availability()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Checks if the browser can support proofreading based on the specified requirements, allowing progressive enhancement.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-indigo-400">static</span> <span class="text-blue-400">availability</span>(options?: <span class="text-emerald-400">ProofreaderCreateCoreOptions</span>): Promise&lt;<span class="text-emerald-400">Availability</span>&gt;;
              </code>
            </div>

            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Options parameter (ProofreaderCreateCoreOptions)</h3>
            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl mb-6">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Property</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">includeCorrectionTypes</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">boolean</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">If true, requires the model to provide specific error types (e.g. spelling, grammar).</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">includeCorrectionExplanations</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">boolean</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">If true, requires the model to provide a short plain-language explanation for corrections.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">expectedInputLanguages</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">sequence&lt;DOMString&gt;</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The expected input language tags (e.g., ['en']).</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">correctionExplanationLanguage</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">DOMString</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The target language for the explanation text.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Returns</h3>
            <p class="text-slate-600 dark:text-slate-400 mb-6">
              A promise that resolves to an <code class="text-sm font-mono text-emerald-600 dark:text-emerald-400">Availability</code> string: 
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'available'</code>, 
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'downloadable'</code>, 
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'downloading'</code>, or 
              <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'unavailable'</code>.
            </p>
            <app-code-snippet code="const availability = await Proofreader.availability(&#123;
  includeCorrectionTypes: true,
  expectedInputLanguages: ['en']
&#125;);
console.log(&quot;Availability:&quot;, availability);"></app-code-snippet>
          </section>

          <!-- create -->
          <section id="create" class="scroll-mt-6">
            <app-docs-section-header anchorId="create" title="Proofreader.create()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Instantiates a new <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">Proofreader</code> object, initiating any necessary model downloads.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-indigo-400">static</span> <span class="text-blue-400">create</span>(options?: <span class="text-emerald-400">ProofreaderCreateOptions</span>): Promise&lt;<span class="text-emerald-400">Proofreader</span>&gt;;
              </code>
            </div>

            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Options parameter (ProofreaderCreateOptions)</h3>
            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl mb-6">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Property</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">includeCorrectionTypes</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">boolean</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">If true, labels errors. Defaults to false.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">includeCorrectionExplanations</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">boolean</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">If true, explains corrections. Defaults to false.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">signal</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">AbortSignal</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Allows aborting the creation and download process.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">monitor</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">CreateMonitorCallback</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Callback to listen to <code class="font-mono text-xs">downloadprogress</code> events.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <app-code-snippet code="const proofreader = await Proofreader.create(&#123;
  includeCorrectionTypes: true,
  includeCorrectionExplanations: true
&#125;);
console.log(&quot;Proofreader created&quot;);"></app-code-snippet>
          </section>

          <!-- proofread -->
          <section id="proofread" class="scroll-mt-6">
            <app-docs-section-header anchorId="proofread" title="proofreader.proofread()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Proofreads the input string and returns a complete <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">ProofreadResult</code> object containing the corrected string and a detailed array of corrections.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-blue-400">proofread</span>(input: <span class="text-emerald-400">DOMString</span>, options?: <span class="text-emerald-400">ProofreaderProofreadOptions</span>): Promise&lt;<span class="text-emerald-400">ProofreadResult</span>&gt;;
              </code>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Returns (ProofreadResult)</h3>
            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl mb-6">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Property</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">correctedInput</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">DOMString</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The fully corrected string.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">corrections</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">sequence&lt;ProofreadCorrection&gt;</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Detailed list containing <code>startIndex</code>, <code>endIndex</code>, <code>correction</code>, and optional <code>types</code>/<code>explanation</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <app-code-snippet code="const proofreader = await Proofreader.create(&#123;
  includeCorrectionTypes: true,
  includeCorrectionExplanations: true
&#125;);
const result = await proofreader.proofread(&quot;I seen him yesterday at the store, and he bought two loafs of bread.&quot;);
console.log(JSON.stringify(result, null, 2));"></app-code-snippet>
          </section>

          <!-- destroy -->
          <section id="destroy" class="scroll-mt-6">
            <app-docs-section-header anchorId="destroy" title="proofreader.destroy()"></app-docs-section-header>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              Destroys the proofreader instance, aborting any active requests and allowing the browser to unload the underlying machine learning models from memory.
            </p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
              <code class="text-sm text-slate-300 font-mono">
                <span class="text-blue-400">destroy</span>(): <span class="text-emerald-400">undefined</span>;
              </code>
            </div>
            <app-code-snippet code="const proofreader = await Proofreader.create();
proofreader.destroy();
console.log(&quot;Proofreader destroyed.&quot;);"></app-code-snippet>
          </section>

          <!-- Properties -->
          <section id="properties" class="scroll-mt-6">
            <app-docs-section-header anchorId="properties" title="Properties"></app-docs-section-header>
            <div class="overflow-x-auto ring-1 ring-slate-200 dark:ring-zinc-800 rounded-xl">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Property</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Type</th>
                    <th class="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-zinc-800 bg-[#ffffff] dark:bg-[#121212]">
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">includeCorrectionTypes</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">boolean (readonly)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">True if the proofreader provides correction types.</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">includeCorrectionExplanations</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">boolean (readonly)</td>
                    <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">True if the proofreader provides explanations.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/language-detector" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Language Detector API</span>
          </a>

          <div></div>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class ProofreaderApiPage {}