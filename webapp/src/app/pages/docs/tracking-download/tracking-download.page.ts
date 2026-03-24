import { Component, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-docs-tracking-download',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Tracking Download</span>
          </nav>
          
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Tracking Model Download
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
          
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            In the unfortunate case that the model is not downloaded yet, developers have the option to monitor the download progress. To do so, every <code>create</code> method accepts a <code>monitor</code> function that can be used to track the download progress.
          </p>
        </div>

        <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-10 max-w-4xl">
          <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <span class="text-xs font-mono text-zinc-400">javascript</span>
          </div>
          <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto"><code>*.create(&#123;
  monitor(m) &#123;
    m.addEventListener("downloadprogress", (e) => &#123;
      console.log("Downloaded " + (e.loaded * 100) + "%");
    &#125;);
  &#125;,
&#125;)</code></pre>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Demo Widget -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Interactive Demo</h2>
          
          <div class="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8">
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Click the button below to initiate a request to create a <code>LanguageModel</code> session. The widget uses the <code>monitor</code> callback to observe real-time download progress.
            </p>
            
            <div class="flex flex-col gap-6">
              <button class="w-fit px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition-all"
                      (click)="triggerDownload()"
                      [disabled]="isDownloading">
                <i class="bi" [ngClass]="isDownloading ? 'bi-hourglass-split animate-spin' : 'bi-cloud-arrow-down'"></i>
                {{ isDownloading ? 'Processing...' : 'Simulate / Start Download' }}
              </button>

              @if (showProgress) {
                <div class="bg-white dark:bg-[#161616] p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Model Payload</span>
                    <span class="text-sm font-mono text-indigo-600 dark:text-indigo-400">{{ (progress * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div class="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out" [style.width.%]="progress * 100"></div>
                  </div>
                  @if (progress === 1) {
                    <div class="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      <i class="bi bi-check-circle-fill"></i> Download Complete & Session Ready!
                    </div>
                  }
                </div>
              }
              
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
          <a routerLink="/docs/check-availability" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Check Availability</span>
          </a>

          <a routerLink="/docs/aborting-operations" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Aborting Operations</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class TrackingDownloadPage {
  isDownloading = false;
  showProgress = false;
  progress = 0;
  errorMessage = '';

  constructor(private cdr: ChangeDetectorRef) {}

  async triggerDownload() {
    this.isDownloading = true;
    this.showProgress = true;
    this.progress = 0;
    this.errorMessage = '';

    try {
      // @ts-ignore
      if (typeof LanguageModel !== 'undefined') {
        // @ts-ignore
        const session = await LanguageModel.create({
          monitor: (m: any) => {
            m.addEventListener('downloadprogress', (e: any) => {
              this.progress = e.loaded;
              this.cdr.detectChanges();
            });
          }
        });
        
        // If it was already downloaded, loaded might jump to 1 instantly or not fire
        this.progress = 1;
        if (session && typeof session.destroy === 'function') {
          session.destroy();
        }
      } else {
        this.errorMessage = 'LanguageModel API is not available in this browser environment.';
      }
    } catch (e: any) {
      console.error(e);
      this.errorMessage = e.message || 'An error occurred while creating the session.';
    } finally {
      this.isDownloading = false;
      this.cdr.detectChanges();
    }
  }
}
