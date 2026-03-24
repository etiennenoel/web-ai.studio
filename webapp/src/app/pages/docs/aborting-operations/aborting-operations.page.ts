import { Component, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-docs-aborting-operations',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Aborting Operations</span>
          </nav>
          
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Aborting Operations
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            Aborting operations is important. Both the <code>create</code> and inference methods support passing an <a href="https://developer.mozilla.org/en-US/docs/Web/API/AbortController" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">AbortController</a>.
          </p>
        </div>

        <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6 max-w-4xl">
          <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <span class="text-xs font-mono text-zinc-400">javascript</span>
          </div>
          <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code><span class="text-purple-400">const</span> abortController = <span class="text-purple-400">new</span> AbortController();

<span class="text-zinc-500">// Passing Abort to create</span>
<span class="text-purple-400">const</span> session = <span class="text-purple-400">await</span> *.create(&#123;
  signal: abortController.signal,
&#125;)

<span class="text-zinc-500">// Passing Abort to "inference" methods</span>
session.*(&#123;
  signal: abortController.signal,
&#125;)

<span class="text-zinc-500">// To abort</span>
abortController.abort();</code></pre>
        </div>

        <div class="mb-10 p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl text-blue-800 dark:text-blue-300 text-sm leading-relaxed max-w-4xl flex gap-3">
          <i class="bi bi-info-circle-fill text-lg mt-0.5"></i>
          <div>
            <strong>Info:</strong> Aborting using the AbortController passed in the <code>create</code> method when doing inference will abort it as well and <strong>destroy the session</strong>. If you only want to abort the inference, you need to pass a specific abortController to the “inference” methods.
          </div>
        </div>

        <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-10 max-w-4xl">
          <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <span class="text-xs font-mono text-zinc-400">javascript</span>
          </div>
          <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code><span class="text-purple-400">const</span> abortController = <span class="text-purple-400">new</span> AbortController();

<span class="text-zinc-500">// Passing Abort to create</span>
<span class="text-purple-400">const</span> session = <span class="text-purple-400">await</span> *.create(&#123;
  signal: abortController.signal,
&#125;)

<span class="text-purple-400">const</span> sessionAbortController = <span class="text-purple-400">new</span> AbortController();

<span class="text-zinc-500">// Passing Abort to "inference" methods</span>
session.*(&#123;
  signal: sessionAbortController.signal,
&#125;)

<span class="text-zinc-500">// Will abort both and destroy the session</span>
abortController.abort();

<span class="text-zinc-500">// Will only abort the "inference"</span>
sessionAbortController.abort();</code></pre>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Demo Widget -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Interactive Demo</h2>
          
          <div class="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8">
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Start generating text, then click "Stop Generation" before it finishes to see the <code>AbortController</code> instantly halt the inference stream.
            </p>
            
            <div class="flex flex-col gap-6">
              <textarea class="w-full bg-[#ffffff] dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
                        rows="3"
                        placeholder="Enter a prompt..."
                        [(ngModel)]="promptText"></textarea>

              <div class="flex items-center gap-3">
                @if (!isGenerating) {
                  <button class="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition-all"
                          (click)="startGeneration()"
                          [disabled]="!promptText.trim()">
                    <i class="bi bi-play-fill"></i> Generate
                  </button>
                } @else {
                  <button class="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-all"
                          (click)="stopGeneration()">
                    <i class="bi bi-stop-fill"></i> Stop Generation
                  </button>
                }
              </div>

              <!-- Output Box -->
              <div class="relative bg-white dark:bg-[#161616] min-h-[100px] p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                @if (outputText) {
                  <div class="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{{ outputText }}</div>
                } @else {
                  <div class="text-slate-400 dark:text-slate-500 text-sm italic">Generated output will appear here...</div>
                }
                
                @if (wasAborted) {
                  <div class="absolute top-3 right-3 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                    Aborted
                  </div>
                }
              </div>
              
              @if (errorMessage) {
                <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <i class="bi bi-exclamation-triangle-fill mr-2"></i> {{ errorMessage }}
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/tracking-download" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Tracking Download</span>
          </a>

          <a routerLink="/docs/errors" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Error Handling</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class AbortingOperationsPage {
  promptText = 'Write a very long poem about the ocean...';
  outputText = '';
  isGenerating = false;
  wasAborted = false;
  errorMessage = '';

  private inferenceController: AbortController | null = null;
  private session: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  async startGeneration() {
    if (!this.promptText.trim()) return;

    this.isGenerating = true;
    this.wasAborted = false;
    this.outputText = '';
    this.errorMessage = '';
    
    this.inferenceController = new AbortController();

    try {
      // @ts-ignore
      if (typeof LanguageModel !== 'undefined') {
        
        if (!this.session) {
          // @ts-ignore
          this.session = await LanguageModel.create();
        }

        const stream = this.session.promptStreaming(this.promptText, {
          signal: this.inferenceController.signal
        });

        for await (const chunk of stream) {
          this.outputText += chunk;
          this.cdr.detectChanges();
        }

      } else {
        this.errorMessage = 'LanguageModel API is not available in this browser environment.';
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.wasAborted = true;
      } else {
        console.error(e);
        this.errorMessage = e.message || 'An error occurred during inference.';
      }
    } finally {
      this.isGenerating = false;
      this.inferenceController = null;
      this.cdr.detectChanges();
    }
  }

  stopGeneration() {
    if (this.inferenceController) {
      this.inferenceController.abort();
    }
  }
}
