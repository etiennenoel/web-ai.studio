import { Component } from '@angular/core';

@Component({
  selector: 'app-writer-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Writer API</span>
          </nav>
          
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Writer API
                </h1>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
            </div>
            
            <div class="flex gap-2">
              <a href="https://webmachinelearning.github.io/writing-assistance-apis/#writer-api" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> W3C Spec
              </a>
              <a href="https://github.com/webmachinelearning/writing-assistance-apis/issues" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-github"></i> Issues
              </a>
            </div>
          </div>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Writer API provides a high-level interface to call on the browser's built-in language model to generate net-new material given a writing task prompt, configuring tone, format, and length.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-12 max-w-4xl">

        <!-- Writer.availability() -->
        <section id="availability" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="availability" title="Writer.availability()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Checks if the browser currently supports creating a writer session with the provided configuration. Returns a Promise resolving to an <code>Availability</code> string (<code>'available' | 'downloadable' | 'unavailable' | 'downloading'</code>).
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code><span class="text-purple-400">static</span> availability(options?: WriterCreateCoreOptions): Promise&lt;Availability&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Parameters (WriterCreateCoreOptions)</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type / Values</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">tone</td>
                  <td class="px-4 py-3 font-mono text-[10px]">"formal" | "neutral" | "casual"</td>
                  <td class="px-4 py-3">The overall tone of the generated writing. Default is <code>"neutral"</code>.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">format</td>
                  <td class="px-4 py-3 font-mono text-[10px]">"plain-text" | "markdown"</td>
                  <td class="px-4 py-3">Output format. Default is <code>"markdown"</code>.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">length</td>
                  <td class="px-4 py-3 font-mono text-[10px]">"short" | "medium" | "long"</td>
                  <td class="px-4 py-3">The target length of the text. Default is <code>"short"</code>.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">expectedInputLanguages</td>
                  <td class="px-4 py-3 font-mono text-[10px]">sequence&lt;DOMString&gt;</td>
                  <td class="px-4 py-3">BCP-47 language tags for the text you intend to use as prompt/context.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">expectedContextLanguages</td>
                  <td class="px-4 py-3 font-mono text-[10px]">sequence&lt;DOMString&gt;</td>
                  <td class="px-4 py-3">BCP-47 language tags for the context strings.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">outputLanguage</td>
                  <td class="px-4 py-3 font-mono text-[10px]">DOMString</td>
                  <td class="px-4 py-3">The language to generate the text in.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet>const availability = await Summarizer.availability(&#123;
  type: 'key-points',
  length: 'short'
&#125;);</app-code-snippet>
        </section>

        <!-- Writer.create() -->
        <section id="create" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="create" title="Writer.create()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Creates and returns a new writer <code>session</code>. If the model is downloadable, calling this method initiates the network download.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code><span class="text-purple-400">static</span> create(options?: WriterCreateOptions): Promise&lt;Writer&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Parameters (WriterCreateOptions)</h3>
          <p class="text-xs text-slate-500 mb-3 italic">Inherits all properties from WriterCreateCoreOptions (above), plus:</p>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">sharedContext</td>
                  <td class="px-4 py-3 font-mono text-[10px]">DOMString</td>
                  <td class="px-4 py-3">Background context shared across all write calls made by this instance.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">monitor</td>
                  <td class="px-4 py-3 font-mono text-[10px]">CreateMonitorCallback</td>
                  <td class="px-4 py-3">A function to track model weight downloads (emits <code>downloadprogress</code> events).</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">signal</td>
                  <td class="px-4 py-3 font-mono text-[10px]">AbortSignal</td>
                  <td class="px-4 py-3">Pass an <code>AbortController.signal</code> to cancel session creation and halt downloads.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet>const summarizer = await Summarizer.create(&#123;
  type: 'key-points',
  format: 'markdown',
  length: 'medium'
&#125;);</app-code-snippet>
        </section>

        <!-- session.write() -->
        <section id="write" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="write" title="session.write()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Executes inference and returns a single Promise resolving to the complete generated text.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>write(input: DOMString, options?: WriterWriteOptions): Promise&lt;DOMString&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Options Parameter (WriterWriteOptions)</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">context</td>
                  <td class="px-4 py-3 font-mono text-[10px]">DOMString</td>
                  <td class="px-4 py-3">Context specific to this individual writing request.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">signal</td>
                  <td class="px-4 py-3 font-mono text-[10px]">AbortSignal</td>
                  <td class="px-4 py-3">Pass an <code>AbortController.signal</code> to cancel this specific operation.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet>const draft = await writer.write(
  "An email to my boss asking for a deadline extension.",
  &#123; context: "The project is Project Apollo." &#125;
);</app-code-snippet>
        </section>

        <!-- session.writeStreaming() -->
        <section id="write-streaming" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="write-streaming" title="session.writeStreaming()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Identical parameters to <code>write()</code>, but returns a <code>ReadableStream</code> of string chunks as they are generated. 
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>writeStreaming(input: DOMString, options?: WriterWriteOptions): ReadableStream;</code></pre>
          </div>
        
          <app-code-snippet>const stream = writer.writeStreaming("A blog post about AI.");
for await (const chunk of stream) &#123;
  processChunk(chunk);
&#125;</app-code-snippet>
        </section>

        <!-- session.measureInputUsage() -->
        <section id="measure-input" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="measure-input" title="session.measureInputUsage()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Calculates how many tokens the given input and context will consume. Returns a Promise resolving to a number.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>measureInputUsage(input: DOMString, options?: WriterWriteOptions): Promise&lt;double&gt;;</code></pre>
          </div>
        
          <app-code-snippet>const tokens = await summarizer.measureInputUsage("Text to summarize...");</app-code-snippet>
        </section>

        <!-- session.destroy() -->
        <section id="destroy" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="destroy" title="session.destroy()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Immediately unloads the session from memory. Any pending <code>write()</code> calls are rejected with an <code>AbortError</code>.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>destroy(): undefined;</code></pre>
          </div>
        
          <app-code-snippet>summarizer.destroy();</app-code-snippet>
        </section>

        <!-- Properties -->
        <section id="properties" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="properties" title="Properties"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Read-only attributes representing the configuration of the current session.
          </p>
          <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly sharedContext: DOMString</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly tone: WriterTone</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly format: WriterFormat</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly length: WriterLength</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly expectedInputLanguages: FrozenArray&lt;DOMString&gt;?</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly expectedContextLanguages: FrozenArray&lt;DOMString&gt;?</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly outputLanguage: DOMString?</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly inputQuota: double</code> - The absolute maximum token limit for this model instance.</li>
          </ul>
        
          <app-code-snippet>const draft = await writer.write(
  "An email to my boss asking for a deadline extension.",
  &#123; context: "The project is Project Apollo." &#125;
);</app-code-snippet>
        </section>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/summarizer" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Summarizer API</span>
          </a>

          <a routerLink="/docs/rewriter" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Rewriter API</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class WriterApiPage {}
