import { Component, NgZone } from '@angular/core';

declare const LanguageModel: any;
declare const Summarizer: any;
declare const Writer: any;
declare const Rewriter: any;
declare const Translator: any;
declare const LanguageDetector: any;
declare const Proofreader: any;

@Component({
  selector: 'app-check-availability',
  template: `
    <div class="h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <a routerLink="/docs" class="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Documentation</a>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Check Availability</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Check Availability & Download
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 24, 2026</p>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            Before using a Built-in AI API, you must check its availability on the user's device. 
            The browser might need to download the model weights (which can be several gigabytes) before it can run inference.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Concepts -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">The Availability States</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            When you call the <code>availability()</code> method, it returns a promise that resolves to one of the following strings:
          </p>

          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm mb-6">
            <table class="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead class="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                <tr>
                  <th class="px-4 py-3 font-semibold">Enum Value</th>
                  <th class="px-4 py-3 font-semibold">Description</th>
                  <th class="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-[#ffffff] dark:bg-[#121212]">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-4 align-top">
                    <div class="flex items-center gap-2">
                      <i class="bi bi-x-circle-fill text-red-500"></i>
                      <code class="font-mono text-red-600 dark:text-red-400">unavailable</code>
                    </div>
                  </td>
                  <td class="px-4 py-4 align-top leading-relaxed">The API is not supported on this device, or the required flags are not enabled.</td>
                  <td class="px-4 py-4 align-top leading-relaxed">You should gracefully disable or hide the feature in your application.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-4 align-top">
                    <div class="flex items-center gap-2">
                      <i class="bi bi-cloud-arrow-down-fill text-blue-500"></i>
                      <code class="font-mono text-blue-600 dark:text-blue-400">downloadable</code>
                    </div>
                  </td>
                  <td class="px-4 py-4 align-top leading-relaxed">The API is supported, but the model needs to be downloaded.</td>
                  <td class="px-4 py-4 align-top leading-relaxed">Calling <code>create()</code> will initiate the download process over the network.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-4 align-top">
                    <div class="flex items-center gap-2">
                      <i class="bi bi-hourglass-split text-amber-500"></i>
                      <code class="font-mono text-amber-600 dark:text-amber-400">downloading</code>
                    </div>
                  </td>
                  <td class="px-4 py-4 align-top leading-relaxed">The model is currently being downloaded by another process or tab.</td>
                  <td class="px-4 py-4 align-top leading-relaxed">Wait for the model to be available. You can safely call <code>create()</code> and it will resolve once the download finishes.</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td class="px-4 py-4 align-top">
                    <div class="flex items-center gap-2">
                      <i class="bi bi-check-circle-fill text-emerald-500"></i>
                      <code class="font-mono text-emerald-600 dark:text-emerald-400">available</code>
                    </div>
                  </td>
                  <td class="px-4 py-4 align-top leading-relaxed">The API is supported, and the necessary model is already downloaded.</td>
                  <td class="px-4 py-4 align-top leading-relaxed">Call <code>create()</code> and it will resolve almost instantly, ready for inference.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Interactive Widget -->
        <div class="mb-12 max-w-4xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Interactive Demo</h2>
            
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-600 dark:text-slate-400">Target API:</span>
              <select [(ngModel)]="apiChoice" (change)="reset()" class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 outline-none shadow-sm cursor-pointer">
                @for (api of availableApis; track api) {
                  <option [value]="api">{{ api }}</option>
                }
              </select>
            </div>
          </div>
          
          <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm border border-zinc-800 mb-6">
            <div class="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-mono text-zinc-400">javascript</span>
            </div>
            <pre class="p-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap"><code>{{ dynamicCode }}</code></pre>
          </div>

          <div class="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center min-h-[300px]">
            
            @if (status === 'idle') {
              <button class="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                      (click)="checkAvailability()">
                Check Availability
              </button>
              <p class="mt-4 text-sm text-slate-500 text-center max-w-xs">
                Click to query the browser for the <strong class="font-mono text-xs">{{ apiChoice }}</strong> status.
              </p>
            }
            
            @if (status === 'checking') {
              <div class="flex flex-col items-center">
                <app-latency-loader></app-latency-loader>
                <p class="mt-4 text-sm text-slate-500 text-center">Checking API capability...</p>
              </div>
            }

            @if (status === 'unavailable') {
              <div class="text-center">
                <i class="bi bi-x-circle text-5xl text-red-500 mb-4 block"></i>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Unavailable</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  <strong class="font-mono text-xs">{{ apiChoice }}</strong> is not available on this device. Ensure Chrome Dev/Canary is used and flags are enabled.
                </p>
                <button class="mt-6 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700"
                        (click)="reset()">
                  Reset
                </button>
              </div>
            }

            @if (status === 'available') {
              <div class="text-center">
                <i class="bi bi-check-circle text-5xl text-emerald-500 mb-4 block"></i>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Available & Ready!</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  The model is already downloaded. You can call <code>create()</code> and it will resolve almost instantly.
                </p>
                <button class="mt-6 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700"
                        (click)="reset()">
                  Reset
                </button>
              </div>
            }

            @if (status === 'downloadable' || status === 'downloading') {
              <div class="text-center w-full max-w-md mx-auto">
                <i class="bi bi-cloud-arrow-down text-5xl text-blue-500 mb-4 block"></i>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Download Required</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  The API is supported, but the model weights must be downloaded first.
                </p>
                
                @if (status === 'downloadable') {
                  <button class="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition-all active:scale-95 border-none mx-auto"
                          (click)="triggerDownload()">
                    Trigger Download
                  </button>
                }
                
                @if (status === 'downloading') {
                  <div class="w-full">
                    <div class="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      <span>Downloading Model...</span>
                      <span>{{ downloadProgress }}%</span>
                    </div>
                    <div class="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                      <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" [style.width.%]="downloadProgress"></div>
                    </div>
                  </div>
                }

                <div class="mt-8">
                  <button class="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700"
                          (click)="reset()">
                    Reset
                  </button>
                </div>
              </div>
            }

          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center max-w-4xl">
          <a routerLink="/docs/get-started" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Getting Started</span>
          </a>

          <a routerLink="/docs/tracking-download" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Tracking Download</span>
          </a>
        </div>

      </div>
    </div>
  `,
  standalone: false,
  host: { class: 'block h-full' }
})
export class CheckAvailabilityPage {
  
  availableApis = [
    'LanguageModel',
    'Summarizer',
    'Writer',
    'Rewriter',
    'Translator',
    'LanguageDetector',
    'Proofreader'
  ];
  
  apiChoice = 'LanguageModel';

  status: 'idle' | 'checking' | 'unavailable' | 'available' | 'downloadable' | 'downloading' = 'idle';
  downloadProgress = 0;

  get dynamicCode(): string {
    let optionsStr = "";
    
    // Some APIs logically require configuration even to check availability/create
    if (this.apiChoice === 'Translator') {
      optionsStr = "{ sourceLanguage: 'en', targetLanguage: 'es' }";
    }

    let code = `// 1. Check availability
const status = await ${this.apiChoice}.availability(${optionsStr});

if (status === 'unavailable') {
  console.log("Not supported.");
  return;
}

if (status === 'downloadable') {
  console.log("Model needs to be downloaded.");
}

// 2. Create session and monitor download
const options = {`;
    
    if (optionsStr) {
      code += `\n  ...(${optionsStr}),`;
    }

    code += `
  monitor(m) {
    m.addEventListener("downloadprogress", (e) => {
      console.log("Downloading: " + Math.round(e.loaded * 100) + "%");
    });
  }
};

const session = await ${this.apiChoice}.create(options);
console.log("${this.apiChoice} model is ready!");`;
    
    return code;
  }

  constructor(private ngZone: NgZone) {}

  getApiObject(): any {
    switch (this.apiChoice) {
      case 'LanguageModel': return typeof LanguageModel !== 'undefined' ? LanguageModel : null;
      case 'Summarizer': return typeof Summarizer !== 'undefined' ? Summarizer : null;
      case 'Writer': return typeof Writer !== 'undefined' ? Writer : null;
      case 'Rewriter': return typeof Rewriter !== 'undefined' ? Rewriter : null;
      case 'Translator': return typeof Translator !== 'undefined' ? Translator : null;
      case 'LanguageDetector': return typeof LanguageDetector !== 'undefined' ? LanguageDetector : null;
      case 'Proofreader': return typeof Proofreader !== 'undefined' ? Proofreader : null;
      default: return null;
    }
  }

  getApiOptions(): any {
    if (this.apiChoice === 'Translator') {
      return { sourceLanguage: 'en', targetLanguage: 'es' };
    }
    return undefined;
  }

  async checkAvailability() {
    this.status = 'checking';
    
    try {
      const apiObj = this.getApiObject();
      if (apiObj && 'availability' in apiObj) {
        const options = this.getApiOptions();
        const result = options ? await apiObj.availability(options) : await apiObj.availability();
        this.status = result;
      } else {
        this.status = 'unavailable';
      }
    } catch (e) {
      console.error(e);
      this.status = 'unavailable';
    }
  }

  async triggerDownload() {
    this.status = 'downloading';
    this.downloadProgress = 0;

    try {
      const apiObj = this.getApiObject();
      let baseOptions = this.getApiOptions() || {};
      
      const session = await apiObj.create({
        ...baseOptions,
        monitor: (m: any) => {
          m.addEventListener("downloadprogress", (e: any) => {
            this.ngZone.run(() => {
              this.downloadProgress = Math.round(e.loaded * 100);
            });
          });
        }
      });
      
      // Once created, the model is available on the device.
      if (session && typeof session.destroy === 'function') {
        session.destroy();
      }
      this.status = 'available';

    } catch (e) {
      console.error("Failed to download model:", e);
      this.status = 'unavailable';
    }
  }

  reset() {
    this.status = 'idle';
    this.downloadProgress = 0;
  }
}
