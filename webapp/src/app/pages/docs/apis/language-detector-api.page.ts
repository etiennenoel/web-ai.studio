import { Component } from '@angular/core';

@Component({
  selector: 'app-language-detector-api',
  host: { class: 'block h-full' },
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">
      <!-- Header -->
      <div class="mb-10">
        <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
          <a routerLink="/docs" class="!no-underline hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
          <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
          <span class="text-slate-900 dark:text-slate-200">Language Detector API</span>
        </nav>
        
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Language Detector API
                </h1>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-2 mt-4 md:mt-0">
              <a href="https://github.com/webmachinelearning/translation-api/blob/main/README.md" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> Explainer
              </a>
              <a href="https://webmachinelearning.github.io/translation-api/" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-journal-code"></i> Specifications
              </a>
              <a href="https://github.com/webmachinelearning/translation-api/issues" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-bug"></i> File an issue
              </a>
              
            </div>
          </div>
          <p class="text-base text-slate-600 dark:text-slate-400 mb-6">
          The Language Detector API identifies the human languages used in a given text on-device, returning a list of probable BCP 47 language tags with confidence scores.
        </p>
      </div>

      <div class="h-px w-full bg-slate-200 dark:bg-zinc-800 mb-10"></div>

      <!-- Main Content -->
      <div class="space-y-12">
        
        <!-- availability -->
        <section id="availability" class="scroll-mt-6">
          <app-docs-section-header anchorId="availability" title="LanguageDetector.availability()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Checks if the user agent can support language detection. If <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-400">expectedInputLanguages</code> is provided, it specifically checks if those languages are supported.
          </p>
          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
            <code class="text-sm text-slate-300 font-mono">
              <span class="text-indigo-400">static</span> <span class="text-blue-400">availability</span>(options?: <span class="text-emerald-400">LanguageDetectorCreateCoreOptions</span>): Promise&lt;<span class="text-emerald-400">Availability</span>&gt;;
            </code>
          </div>

          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Parameters (LanguageDetectorCreateCoreOptions)</h3>
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
                  <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">expectedInputLanguages</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">sequence&lt;DOMString&gt;</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-slate-300 mb-1">Optional</span><br>
                    An array of BCP 47 language tags that the application expects to detect.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Returns</h3>
          <p class="text-slate-600 dark:text-slate-400 mb-6">
            A promise resolving to <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'available'</code>, <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'downloadable'</code>, <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'downloading'</code>, or <code class="text-sm font-mono text-slate-800 dark:text-slate-200">'unavailable'</code>.
          </p>
          <app-code-snippet code="const availability = await LanguageDetector.availability();
console.log(&quot;Availability:&quot;, availability);"></app-code-snippet>
        </section>

        <!-- create -->
        <section id="create" class="scroll-mt-6">
          <app-docs-section-header anchorId="create" title="LanguageDetector.create()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Instantiates a new <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">LanguageDetector</code> object, initiating any necessary model downloads.
          </p>
          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
            <code class="text-sm text-slate-300 font-mono">
              <span class="text-indigo-400">static</span> <span class="text-blue-400">create</span>(options?: <span class="text-emerald-400">LanguageDetectorCreateOptions</span>): Promise&lt;<span class="text-emerald-400">LanguageDetector</span>&gt;;
            </code>
          </div>

          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Parameters (LanguageDetectorCreateOptions)</h3>
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
                  <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">expectedInputLanguages</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">sequence&lt;DOMString&gt;</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-slate-300 mb-1">Optional</span><br>
                    Helps the user agent download specific models necessary to support these languages.
                  </td>
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
          <app-code-snippet code="const detector = await LanguageDetector.create();
console.log(&quot;Detector created&quot;);"></app-code-snippet>
        </section>

        <!-- detect -->
        <section id="detect" class="scroll-mt-6">
          <app-docs-section-header anchorId="detect" title="detector.detect()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Detects the languages in the input string. Returns an array of results ordered descendingly by confidence. Extremely low confidence results are excluded. The final entry in the array is always for the undetermined language (<code class="font-mono text-xs">'und'</code>).
          </p>
          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
            <code class="text-sm text-slate-300 font-mono">
              <span class="text-blue-400">detect</span>(input: <span class="text-emerald-400">DOMString</span>, options?: <span class="text-emerald-400">LanguageDetectorDetectOptions</span>): Promise&lt;sequence&lt;<span class="text-emerald-400">LanguageDetectionResult</span>&gt;&gt;;
            </code>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Parameters</h3>
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
                  <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">input</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">DOMString</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The string to analyze.</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-mono text-pink-600 dark:text-pink-400">options.signal</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">AbortSignal</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Optional signal to abort the detection request.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">Returns (LanguageDetectionResult)</h3>
          <p class="text-slate-600 dark:text-slate-400 mb-6">
            A promise that resolves to an array of objects containing <code class="font-mono text-xs">detectedLanguage</code> (a BCP 47 string) and <code class="font-mono text-xs">confidence</code> (a double between 0 and 1).
          </p>

          <app-code-snippet code="const detector = await LanguageDetector.create();
const results = await detector.detect(&quot;Bonjour, comment allez-vous?&quot;);
for (const result of results) &#123;
  console.log(result.detectedLanguage, result.confidence);
&#125;"></app-code-snippet>
        </section>

        <!-- measureInputUsage -->
        <section id="measure-input" class="scroll-mt-6">
          <app-docs-section-header anchorId="measure-input" title="detector.measureInputUsage()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Calculates how much quota the string would consume without executing the detection. If this returns a value greater than <code class="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">inputQuota</code>, running detection on it will throw a <code class="text-sm font-mono">QuotaExceededError</code>.
          </p>
          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
            <code class="text-sm text-slate-300 font-mono">
              <span class="text-blue-400">measureInputUsage</span>(input: <span class="text-emerald-400">DOMString</span>, options?: <span class="text-emerald-400">LanguageDetectorDetectOptions</span>): Promise&lt;<span class="text-emerald-400">double</span>&gt;;
            </code>
          </div>
          <app-code-snippet code="const detector = await LanguageDetector.create();
const usage = await detector.measureInputUsage(&quot;Some large text&quot;);
console.log(&quot;Tokens:&quot;, usage);"></app-code-snippet>
        </section>

        <!-- destroy -->
        <section id="destroy" class="scroll-mt-6">
          <app-docs-section-header anchorId="destroy" title="detector.destroy()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Destroys the language detector instance, aborting any active requests and allowing the browser to unload the underlying machine learning models from memory.
          </p>
          <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto mb-6">
            <code class="text-sm text-slate-300 font-mono">
              <span class="text-blue-400">destroy</span>(): <span class="text-emerald-400">undefined</span>;
            </code>
          </div>
          <app-code-snippet code="const detector = await LanguageDetector.create();
detector.destroy();
console.log(&quot;Detector destroyed.&quot;);"></app-code-snippet>
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
                  <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">expectedInputLanguages</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">FrozenArray&lt;DOMString&gt; | null</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The array of languages expected to be detected, provided during creation.</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">inputQuota</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">double (readonly)</td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">The maximum input usage allowed per detection operation. Can be <code class="font-mono text-xs">+Infinity</code> if the implementation uses iterative chunking.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>
      </div>
    </div>`,
  standalone: false
})
export class LanguageDetectorApiPage {}
