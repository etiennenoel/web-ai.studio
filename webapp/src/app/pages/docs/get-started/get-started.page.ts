import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-get-started',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <span>Documentation</span>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Overview</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Getting Started
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 23, 2026</p>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Chrome's Built-in AI provides a suite of JavaScript APIs allowing web applications to execute advanced language models directly on the client's device. This enables zero-cost inference, enhanced data privacy, and ultra-low latency execution.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10">

        <!-- Availability & Origin Trials -->
        <div class="mb-12">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Availability & Origin Trials</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Built-in AI APIs are actively rolling out in Google Chrome. To test and deploy these features to your users today, you should utilize Origin Trials.
          </p>
          <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <li><strong>Origin Trials:</strong> Sign up for the relevant Origin Trials via the Chrome Developer dashboard to enable these APIs for all users visiting your domain, bypassing the need for manual browser flags.</li>
            <li><strong>Local Testing:</strong> For local development without an Origin Trial token, you may still enable specific feature flags (e.g., <code class="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">#prompt-api-for-gemini-nano</code>) in <code>chrome://flags</code>.</li>
            <li><strong>Hardware Requirements:</strong> Execution requires a device with sufficient storage and memory to download and run the on-device models. The <code>availability()</code> check handles hardware compatibility gracefully.</li>
          </ul>
        </div>

        <!-- Available APIs -->
        <div class="mb-12">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Core Concepts</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            The platform exposes two primary categories of APIs on the global window object. 
            <em class="block mt-2 text-slate-500">Note: The legacy <code>window.ai</code> namespace is deprecated.</em>
          </p>

          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">1. Task-Specific APIs</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                High-level abstractions tailored for common NLP tasks. These enforce structured output and abstract away prompt engineering.
              </p>
              <div class="flex flex-wrap gap-2">
                <code class="font-mono text-xs bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">Summarizer</code>
                <code class="font-mono text-xs bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">Writer</code>
                <code class="font-mono text-xs bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">Rewriter</code>
                <code class="font-mono text-xs bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 px-2 py-1 rounded">Translator</code>
                <code class="font-mono text-xs bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 px-2 py-1 rounded">LanguageDetector</code>
                <code class="font-mono text-xs bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">Proofreader</code>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">2. Prompt API</h3>
              <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                A lower-level interface exposing the raw instruction-tuned model. Requires manual prompt engineering but supports advanced features like system instructions, n-shot prompting, and tool execution.
              </p>
              <code class="font-mono text-xs bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-pink-700 dark:text-pink-400 px-2 py-1 rounded">LanguageModel</code>
            </div>
          </div>
        </div>

        <!-- Implementation Lifecycle -->
        <div class="mb-12">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Implementation Lifecycle</h2>
          
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            All Built-in AI APIs adhere to a standardized asynchronous lifecycle:
          </p>

          <ol class="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-3 mb-8 marker:font-bold marker:text-slate-400">
            <li>
              <strong class="text-slate-800 dark:text-slate-200">Check Availability:</strong> Invoke <code>availability()</code> to determine if the client supports the API and whether a model download is required. Returns <code>available</code>, <code>downloadable</code>, or <code>unavailable</code>.
            </li>
            <li>
              <strong class="text-slate-800 dark:text-slate-200">Initialize Session:</strong> Invoke <code>create()</code> to instantiate the model session. If the model is <code>downloadable</code>, this step handles fetching the weights over the network.
            </li>
            <li>
              <strong class="text-slate-800 dark:text-slate-200">Execute Inference:</strong> Pass inputs to the relevant execution method (e.g., <code>promptStreaming()</code>, <code>summarize()</code>). Streaming methods return a <code>ReadableStream</code>.
            </li>
            <li>
              <strong class="text-slate-800 dark:text-slate-200">Dispose:</strong> Invoke <code>destroy()</code> on the session object to release VRAM and system memory when the context is no longer needed.
            </li>
          </ol>

          <div class="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-sm">
            <div class="px-4 py-2.5 border-b border-zinc-800/80 bg-[#161616] flex items-center">
              <span class="text-xs text-zinc-400 font-mono">inference.ts</span>
            </div>
            <div class="h-[460px] relative">
              <app-code-editor [code]="codeExample" [language]="'typescript'"></app-code-editor>
            </div>
          </div>
        </div>

        <!-- Next Steps -->
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Next Steps</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Explore our interactive <a routerLink="/demos" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">API Demos</a> to see live implementations of Summarization, Translation, Code Generation, and more.
          </p>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <div></div> <!-- Spacer for flex-between -->

          <a routerLink="/docs/check-availability" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Check Availability</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class GetStartedPage implements OnInit {
  
  codeExample = `// 1. Verify environment support
const availability = await LanguageModel.availability();

if (availability === "unavailable") {
  console.error("Device does not support Built-in AI.");
  return;
}

// 2. Initialize inference session
// If availability === 'downloadable', this triggers model fetching
const session = await LanguageModel.create({
  systemPrompt: "You are a helpful assistant.",
  monitor(m) {
    m.addEventListener("downloadprogress", e => {
      console.log("Model download progress: " + Math.round(e.loaded * 100) + "%");
    });
  }
});

// 3. Execute prompt and consume stream
const stream = session.promptStreaming("Explain quantum computing in one sentence.");

for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// 4. Dispose session to release VRAM
session.destroy();`;

  constructor() {}

  ngOnInit(): void {}
}
