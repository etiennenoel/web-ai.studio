import { Component } from '@angular/core';

@Component({
  selector: 'app-rewriter-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="!no-underline hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Rewriter API</span>
          </nav>
          
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Rewriter API
                </h1>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 uppercase tracking-wider border border-amber-200 dark:border-amber-500/30">
                  Dev Trial
                </span>
              </div>
            </div>
            

            <div class="flex flex-wrap gap-2 mt-4 md:mt-0">
              <a href="https://github.com/webmachinelearning/writing-assistance-apis/blob/main/README.md" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> Explainer
              </a>
              <a href="https://webmachinelearning.github.io/writing-assistance-apis/" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-journal-code"></i> Specifications
              </a>
              <a href="https://github.com/webmachinelearning/writing-assistance-apis/issues" target="_blank" class="!no-underline px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-bug"></i> File an issue
              </a>
              
            </div>
          </div>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Rewriter API provides a high-level interface to call on the browser's built-in language model to transform, rephrase, expand, or adjust the tone and format of existing text inputs.
          </p>

          <!-- Dev Trial Notice -->
          <div class="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300 text-sm leading-relaxed max-w-4xl flex gap-3">
            <i class="bi bi-exclamation-triangle-fill text-lg mt-0.5"></i>
            <div>
              <strong>Developer Trial:</strong> This API is currently in active development. To use it, you must enable the <strong>#rewriter-api-for-gemini-nano</strong> flag in <code class="bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 rounded text-xs font-mono">chrome://flags</code>.
            </div>
          </div>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-12 max-w-4xl">

        <!-- Rewriter.availability() -->
        <section id="availability" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="availability" title="Rewriter.availability()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Checks if the browser currently supports creating a rewriter session with the provided configuration. Returns a Promise resolving to an <code>Availability</code> string (<code>'available' | 'downloadable' | 'unavailable' | 'downloading'</code>).
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code><span class="text-purple-400">static</span> availability(options?: RewriterCreateCoreOptions): Promise&lt;Availability&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Parameters (RewriterCreateCoreOptions)</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type / Values</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">tone</td>
                  <td class="px-4 py-3 font-mono text-[10px]">"as-is" | "more-formal" | "more-casual"</td>
                  <td class="px-4 py-3">The directional tone of the rewritten text. Default is <code>"as-is"</code>.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">format</td>
                  <td class="px-4 py-3 font-mono text-[10px]">"as-is" | "plain-text" | "markdown"</td>
                  <td class="px-4 py-3">Output format. Default is <code>"as-is"</code>.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">length</td>
                  <td class="px-4 py-3 font-mono text-[10px]">"as-is" | "shorter" | "longer"</td>
                  <td class="px-4 py-3">The target length of the text relative to the input. Default is <code>"as-is"</code>.</td>
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
                  <td class="px-4 py-3">The language to output the rewritten text in.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet code="const availability = await Rewriter.availability();
console.log(&quot;Availability:&quot;, availability);"></app-code-snippet>
        </section>

        <!-- Rewriter.create() -->
        <section id="create" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="create" title="Rewriter.create()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Creates and returns a new rewriter <code>session</code>. If the model is downloadable, calling this method initiates the network download.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code><span class="text-purple-400">static</span> create(options?: RewriterCreateOptions): Promise&lt;Rewriter&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Parameters (RewriterCreateOptions)</h3>
          <p class="text-xs text-slate-500 mb-3 italic">Inherits all properties from RewriterCreateCoreOptions (above), plus:</p>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">sharedContext</td>
                  <td class="px-4 py-3 font-mono text-[10px]">DOMString</td>
                  <td class="px-4 py-3">Background context shared across all rewrite calls made by this instance.</td>
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
        
          <app-code-snippet code="const rewriter = await Rewriter.create(&#123; tone: 'more-formal' &#125;);
console.log(&quot;Rewriter created&quot;);"></app-code-snippet>
        </section>

        <!-- session.rewrite() -->
        <section id="rewrite" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="rewrite" title="session.rewrite()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Executes inference and returns a single Promise resolving to the complete rewritten text.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>rewrite(input: DOMString, options?: RewriterRewriteOptions): Promise&lt;DOMString&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Options Parameter (RewriterRewriteOptions)</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">context</td>
                  <td class="px-4 py-3 font-mono text-[10px]">DOMString</td>
                  <td class="px-4 py-3">Context specific to this individual rewriting request.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">signal</td>
                  <td class="px-4 py-3 font-mono text-[10px]">AbortSignal</td>
                  <td class="px-4 py-3">Pass an <code>AbortController.signal</code> to cancel this specific operation.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet code="const rewriter = await Rewriter.create(&#123; tone: 'more-formal' &#125;);
const polishedText = await rewriter.rewrite(
  &quot;this app is pretty good but crashes sometimes&quot;
);
console.log(polishedText);"></app-code-snippet>
        </section>

        <!-- session.rewriteStreaming() -->
        <section id="rewrite-streaming" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="rewrite-streaming" title="session.rewriteStreaming()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Identical parameters to <code>rewrite()</code>, but returns a <code>ReadableStream</code> of string chunks as they are generated. 
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>rewriteStreaming(input: DOMString, options?: RewriterRewriteOptions): ReadableStream;</code></pre>
          </div>
        
          <app-code-snippet code="const rewriter = await Rewriter.create();
const stream = rewriter.rewriteStreaming(&quot;Some text to rewrite&quot;);
for await (const chunk of stream) &#123;
  console.log(&quot;Chunk:&quot;, chunk);
&#125;"></app-code-snippet>
        </section>

        <!-- session.measureInputUsage() -->
        <section id="measure-input" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="measure-input" title="session.measureInputUsage()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Calculates how many tokens the given input and context will consume. Returns a Promise resolving to a number.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>measureInputUsage(input: DOMString, options?: RewriterRewriteOptions): Promise&lt;double&gt;;</code></pre>
          </div>
        
          <app-code-snippet code="const rewriter = await Rewriter.create();
const tokens = await rewriter.measureInputUsage(&quot;Text to rewrite...&quot;);
console.log(&quot;Tokens:&quot;, tokens);"></app-code-snippet>
        </section>

        <!-- session.destroy() -->
        <section id="destroy" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="destroy" title="session.destroy()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Immediately unloads the session from memory. Any pending <code>rewrite()</code> calls are rejected with an <code>AbortError</code>.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>destroy(): undefined;</code></pre>
          </div>
        
          <app-code-snippet code="const rewriter = await Rewriter.create();
rewriter.destroy();
console.log(&quot;Rewriter destroyed.&quot;);"></app-code-snippet>
        </section>

        <!-- Properties -->
        <section id="properties" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="properties" title="Properties"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Read-only attributes representing the configuration of the current session.
          </p>
          <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly sharedContext: DOMString</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly tone: RewriterTone</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly format: RewriterFormat</code></li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly length: RewriterLength</code></li>
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
          <a routerLink="/docs/writer" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Writer API</span>
          </a>

          <a routerLink="/docs/translator" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Translator API</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class RewriterApiPage {}
