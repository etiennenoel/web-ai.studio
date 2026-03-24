import { Component } from '@angular/core';

@Component({
  selector: 'app-prompt-api-docs',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200 scroll-smooth">
      <div class="max-w-5xl w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Prompt API</span>
          </nav>
          
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Prompt API
                </h1>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 uppercase tracking-wider border border-blue-200 dark:border-blue-500/30">
                  Origin Trial
                </span>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
            </div>
            
            <div class="flex gap-2">
              <a href="https://webmachinelearning.github.io/prompt-api/" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> W3C Spec
              </a>
              <a href="https://github.com/webmachinelearning/prompt-api/issues" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                <i class="bi bi-github"></i> Issues
              </a>
            </div>
          </div>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            The Prompt API gives web pages the ability to directly prompt an instruction-tuned language model natively provided by the browser. It supports zero-shot and n-shot prompting, multimodal inputs, streaming responses, JSON schema constraints, and intelligent tool calling.
          </p>

          <!-- Origin Trial Notice -->
          <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl text-blue-800 dark:text-blue-300 text-sm leading-relaxed max-w-4xl flex gap-3">
            <i class="bi bi-info-circle-fill text-lg mt-0.5"></i>
            <div>
              <strong>Origin Trial Active:</strong> This API is currently experimental. To use it in production without forcing your users to enable Chrome flags, you must register your domain for the Origin Trial.
              <a href="https://developer.chrome.com/docs/web-platform/origin-trials" target="_blank" class="ml-1 text-blue-600 dark:text-blue-400 underline font-semibold hover:text-blue-700 dark:hover:text-blue-300">Register Here <i class="bi bi-box-arrow-up-right text-[10px]"></i></a>
            </div>
          </div>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-12 max-w-4xl">

        <!-- LanguageModel.availability() -->
        <section id="language-model-availability" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="language-model-availability" title="LanguageModel.availability()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            A static method that checks if the browser currently supports creating a language model session with the provided configuration. It returns a Promise resolving to an <code>Availability</code> string: <code>'readily' | 'after-download' | 'no'</code> (Legacy) or newer equivalents like <code>'available' | 'downloadable' | 'unavailable' | 'downloading'</code>.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code><span class="text-purple-400">static</span> availability(options?: LanguageModelCreateCoreOptions): Promise&lt;Availability&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Parameters (LanguageModelCreateCoreOptions)</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">expectedInputs</td>
                  <td class="px-4 py-3 font-mono text-xs">sequence&lt;LanguageModelExpected&gt;</td>
                  <td class="px-4 py-3">Signals expected inputs to pre-download needed adapters (e.g. <code>&#123; type: "audio" &#125;</code> or <code>&#123; type: "text", languages: ["es"] &#125;</code>).</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">expectedOutputs</td>
                  <td class="px-4 py-3 font-mono text-xs">sequence&lt;LanguageModelExpected&gt;</td>
                  <td class="px-4 py-3">Signals expected output formats/languages. Currently only supports text.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">tools</td>
                  <td class="px-4 py-3 font-mono text-xs">sequence&lt;LanguageModelTool&gt;</td>
                  <td class="px-4 py-3">Array of tool definitions with <code>name</code>, <code>description</code>, <code>inputSchema</code>, and <code>execute</code> functions.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet>const availability = await LanguageModel.availability();
if (availability !== "unavailable") &#123;
  if (availability !== "available") &#123;
    console.log("Requires download.");
  &#125;
  // Safe to call create()
&#125;</app-code-snippet>
        </section>

        <!-- LanguageModel.create() -->
        <section id="language-model-create" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="language-model-create" title="LanguageModel.create()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Creates and returns a new language model <code>session</code>. If the model is not yet available but is "downloadable", calling this method initiates the network download. If download fails, it throws a <code>NetworkError</code>.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code><span class="text-purple-400">static</span> create(options?: LanguageModelCreateOptions): Promise&lt;LanguageModel&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Parameters (LanguageModelCreateOptions)</h3>
          <p class="text-xs text-slate-500 mb-3 italic">Inherits all properties from LanguageModelCreateCoreOptions (above), plus:</p>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">initialPrompts</td>
                  <td class="px-4 py-3 font-mono text-xs">sequence&lt;LanguageModelMessage&gt;</td>
                  <td class="px-4 py-3">Establishes system context or n-shot examples. The <code>"system"</code> role must be at the 0th index.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">monitor</td>
                  <td class="px-4 py-3 font-mono text-xs">CreateMonitorCallback</td>
                  <td class="px-4 py-3">A function <code>(m) =&gt; void</code> where <code>m</code> emits <code>downloadprogress</code> events to track model weight download (<code>e.loaded</code> 0 to 1).</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">signal</td>
                  <td class="px-4 py-3 font-mono text-xs">AbortSignal</td>
                  <td class="px-4 py-3">Pass an <code>AbortController.signal</code> to cancel session creation and halt the model download.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet>const session = await LanguageModel.create(&#123;
  initialPrompts: [&#123; role: "system", content: "You are a helpful assistant." &#125;],
  expectedInputs: [&#123; type: "text" &#125;]
&#125;);</app-code-snippet>
        </section>

        <!-- session.prompt() -->
        <section id="session-prompt" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="session-prompt" title="session.prompt()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Executes inference and returns a single Promise resolving to the complete generated text. If the input exceeds the available context window, it evicts older conversation history (excluding the system prompt) or throws a <code>QuotaExceededError</code>.
          </p>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>prompt(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise&lt;DOMString&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Input Parameter (LanguageModelPrompt)</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
            The input can be a simple <code>DOMString</code> (zero-shot shorthand), or an array of <code>LanguageModelMessage</code> objects for complex/multimodal prompts:
          </p>
          <div class="bg-slate-50 dark:bg-[#161616] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 font-mono text-xs text-slate-700 dark:text-slate-300 mb-6 overflow-x-auto">
            [<br>
            &nbsp;&nbsp;&#123;<br>
            &nbsp;&nbsp;&nbsp;&nbsp;role: "user" | "assistant",<br>
            &nbsp;&nbsp;&nbsp;&nbsp;content: "String content" | [<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#123; type: "text", value: "Hello" &#125;,<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#123; type: "image", value: ImageBitmapSource &#125;,<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#123; type: "audio", value: AudioBuffer &#125;<br>
            &nbsp;&nbsp;&nbsp;&nbsp;],<br>
            &nbsp;&nbsp;&nbsp;&nbsp;prefix: boolean // (If true, pre-fills the assistant response. Valid only on final assistant message)<br>
            &nbsp;&nbsp;&#125;<br>
            ]
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Options Parameter</h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr><th class="px-4 py-3 font-semibold">Name</th><th class="px-4 py-3 font-semibold">Type</th><th class="px-4 py-3 font-semibold">Description</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">responseConstraint</td>
                  <td class="px-4 py-3 font-mono text-xs">object | RegExp</td>
                  <td class="px-4 py-3">A JSON Schema object or RegExp to strictly constrain the model's output formatting.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">omitResponseConstraintInput</td>
                  <td class="px-4 py-3 font-mono text-xs">boolean</td>
                  <td class="px-4 py-3">If true, stops the browser from automatically injecting the schema definition into the prompt context, saving tokens.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                  <td class="px-4 py-3 font-mono text-xs">signal</td>
                  <td class="px-4 py-3 font-mono text-xs">AbortSignal</td>
                  <td class="px-4 py-3">Pass an <code>AbortController.signal</code> to cancel this specific generation request.</td>
                </tr>
              </tbody>
            </table>
          </div>
        
          <app-code-snippet>const response = await session.prompt([
  &#123; role: "user", content: "What is the capital of France?" &#125;
]);
console.log(response); // "The capital of France is Paris."</app-code-snippet>
        </section>

        <!-- session.promptStreaming() -->
        <section id="session-prompt-streaming" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="session-prompt-streaming" title="session.promptStreaming()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Identical parameters to <code>prompt()</code>, but returns a <code>ReadableStream</code> of string chunks as they are generated by the model. 
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>promptStreaming(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): ReadableStream;</code></pre>
          </div>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Must be consumed using an async iterator (e.g., <code>for await (const chunk of stream)</code>). Highly recommended for improving perceived latency (TTFT).
          </p>
        
          <app-code-snippet>const stream = session.promptStreaming("Write a short poem about the ocean.");
let fullResponse = "";
for await (const chunk of stream) &#123;
  fullResponse += chunk;
  updateUI(fullResponse); // Updates as words generate
&#125;</app-code-snippet>
        </section>

        <!-- session.append() -->
        <section id="session-append" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="session-append" title="session.append()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Ingests and processes tokens into the context window ahead of time <em>without</em> triggering a response from the model. Extremely useful for "pre-warming" the session with large files or multimodal images before the user hits "Generate".
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>append(input: LanguageModelPrompt, options?: LanguageModelAppendOptions): Promise&lt;undefined&gt;;</code></pre>
          </div>
        
          <app-code-snippet>// Pre-load context into the model's memory
await session.append([
  &#123; role: "user", content: "Here is my long document: ..." &#125;
]);
// Now later prompts will process instantly
const response = await session.prompt("Summarize the document I gave you.");</app-code-snippet>
        </section>

        <!-- session.measureContextUsage() -->
        <section id="session-measure-context" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="session-measure-context" title="session.measureContextUsage()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Calculates exactly how many tokens a given prompt will consume. Returns a Promise. Note: This does not add the prompt to the session history.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>measureContextUsage(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise&lt;double&gt;;</code></pre>
          </div>

          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-300 mb-3  tracking-wider">Related Context Attributes</h3>
          <ul class="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly contextUsage: double</code> - The current number of tokens stored in the session history.</li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">readonly contextWindow: double</code> - The absolute maximum token limit for this model instance.</li>
            <li><code class="font-mono text-indigo-600 dark:text-indigo-400">oncontextoverflow</code> - Event fired when a prompt causes the session history to overflow and evict older messages.</li>
          </ul>
        
          <app-code-snippet>const tokenCount = await session.measureContextUsage("This is a test prompt.");
  console.log("This prompt will cost " + tokenCount + " tokens.");
  console.log("Total usage: " + session.contextUsage + " / " + session.contextWindow);</app-code-snippet>
        </section>

        <!-- session.clone() -->
        <section id="session-clone" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="session-clone" title="session.clone()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Deep copies the current session, including its entire conversational history (context) and parameters. Useful for branching conversations (e.g. Tree of Thoughts) without re-evaluating past tokens.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>clone(options?: LanguageModelCloneOptions): Promise&lt;LanguageModel&gt;;</code></pre>
          </div>
          <p class="text-xs text-slate-500 mb-3 italic">Options takes an optional <code>AbortSignal</code>.</p>
        
          <app-code-snippet>// Create a base session
const baseSession = await LanguageModel.create(&#123; initialPrompts: [...] &#125;);
await baseSession.append("Common knowledge base.");

// Branch into multiple independent conversations cheaply
const user1Session = await baseSession.clone();
const user2Session = await baseSession.clone();</app-code-snippet>
        </section>

        <!-- session.destroy() -->
        <section id="session-destroy" class="mb-16 max-w-4xl scroll-mt-6">
          <app-docs-section-header anchorId="session-destroy" title="session.destroy()"></app-docs-section-header>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Immediately unloads the session from memory. Any pending <code>prompt()</code> or <code>promptStreaming()</code> calls on this session are rejected with an <code>AbortError</code>. If no other APIs are using the language model, Chrome can free the VRAM/RAM payload.
          </p>
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>destroy(): undefined;</code></pre>
          </div>
        
          <app-code-snippet>// Unload from memory when finished
session.destroy();</app-code-snippet>
        </section>

        <!-- Deprecations -->
        <section id="deprecations" class="mb-16 max-w-4xl pt-8 border-t border-red-200 dark:border-red-900/30 scroll-mt-6">
          <h2 class="text-xl font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <i class="bi bi-exclamation-triangle"></i> Deprecations & Aliases
          </h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            To address inconsistencies across models, several parameters have been heavily restricted. The following features are <strong>deprecated in web pages</strong> and are now <em>only functional within Chrome Extension contexts</em>.
          </p>

          <ul class="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <li class="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
              <strong class="text-slate-900 dark:text-slate-200 block mb-1">Hyperparameters</strong>
              <code>temperature</code> and <code>topK</code> inside <code>create()</code> options, as well as accessing <code>session.temperature</code>, will be ignored in standard web contexts.
            </li>
            <li class="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
              <strong class="text-slate-900 dark:text-slate-200 block mb-1">LanguageModel.params()</strong>
              The static <code>params()</code> method used to query default <code>topK/temperature</code> is deprecated for web pages.
            </li>
            <li class="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
              <strong class="text-slate-900 dark:text-slate-200 block mb-1">Renamed Aliases</strong>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li><code>inputUsage</code> is now <code>contextUsage</code></li>
                <li><code>inputQuota</code> is now <code>contextWindow</code></li>
                <li><code>measureInputUsage()</code> is now <code>measureContextUsage()</code></li>
                <li><code>onquotaoverflow</code> is now <code>oncontextoverflow</code></li>
              </ul>
            </li>
          </ul>
        </section>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/errors" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Error Handling</span>
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
