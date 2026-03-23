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
    <div class="h-full overflow-y-auto bg-white dark:bg-[#121212] transition-colors duration-200">
      <div class="w-full p-6 md:p-12 pb-32 font-sans">
        
        <!-- Header -->
        <div class="mb-10">
          <nav class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center space-x-2">
            <span>Documentation</span>
            <i class="bi bi-chevron-right text-[10px] opacity-70"></i>
            <span class="text-slate-900 dark:text-slate-200">Check Availability</span>
          </nav>
          <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Check Availability & Download
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Last updated: March 23, 2026</p>
          <p class="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
            Before using a Built-in AI API, you must check its availability on the user's device. 
            The browser might need to download the model weights (which can be several gigabytes) before it can run inference.
          </p>
        </div>

        <hr class="border-t border-slate-200 dark:border-zinc-800 mb-10 max-w-4xl">

        <!-- Concepts -->
        <div class="mb-12 max-w-4xl">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">The Availability States</h2>
          <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
            When you call the <code>availability()</code> method, it returns a promise that resolves to one of the following strings:
          </p>

          <div class="space-y-4">
            <div class="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <h3 class="font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-2">
                <i class="bi bi-check-circle-fill text-emerald-500"></i> available
              </h3>
              <p class="text-slate-500 dark:text-slate-400 text-sm">
                The API is supported, and the necessary model is already downloaded and ready to use immediately.
              </p>
            </div>

            <div class="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <h3 class="font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-2">
                <i class="bi bi-cloud-arrow-down-fill text-blue-500"></i> downloadable
              </h3>
              <p class="text-slate-500 dark:text-slate-400 text-sm">
                The API is supported, but the model needs to be downloaded. Calling <code>create()</code> will initiate the download process over the network.
              </p>
            </div>

            <div class="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800/80">
              <h3 class="font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-2">
                <i class="bi bi-x-circle-fill text-red-500"></i> unavailable
              </h3>
              <p class="text-slate-500 dark:text-slate-400 text-sm">
                The API is not supported on this device, or the required flags are not enabled. You should fall back to a cloud-based API or hide the feature.
              </p>
            </div>
          </div>
        </div>

        <!-- Interactive Widget & Code -->
        <div class="mb-12 max-w-6xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Interactive Example</h2>
            
            <select [(ngModel)]="apiChoice" (change)="reset()" class="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2">
              @for (api of availableApis; track api) {
                <option [value]="api">{{ api }}</option>
              }
            </select>
          </div>
          
          <div class="flex flex-col lg:flex-row gap-6">
            
            <!-- Widget -->
            <div class="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div class="px-5 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Live Widget</span>
                @if (status === 'checking') {
                  <app-latency-loader></app-latency-loader>
                }
              </div>
              
              <div class="p-6 flex flex-col items-center justify-center flex-grow min-h-[300px]">
                
                @if (status === 'idle') {
                  <button class="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all active:scale-95 border-none"
                          (click)="checkAvailability()">
                    Check Availability
                  </button>
                  <p class="mt-4 text-sm text-slate-500 text-center max-w-xs">
                    Click to query the browser for the <strong class="font-mono text-xs">{{ apiChoice }}</strong> status.
                  </p>
                }
                
                @if (status === 'unavailable') {
                  <div class="text-center">
                    <i class="bi bi-x-circle text-5xl text-red-500 mb-4 block"></i>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Unavailable</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      <strong class="font-mono text-xs">{{ apiChoice }}</strong> is not available on this device. Ensure Chrome Dev/Canary is used and flags are enabled.
                    </p>
                    <button class="mt-6 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
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
                    <button class="mt-6 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
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

                    <button class="mt-8 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                            (click)="reset()">
                      Reset
                    </button>
                  </div>
                }

              </div>
            </div>

            <!-- Code -->
            <div class="flex-1 bg-[#0e0e0e] rounded-2xl overflow-hidden border border-zinc-800/80 shadow-md">
              <div class="px-4 py-2.5 border-b border-zinc-800/60 bg-[#161616] flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <i class="bi bi-filetype-ts text-blue-400 text-sm"></i>
                  <span class="text-xs text-zinc-300 font-mono">download.ts</span>
                </div>
              </div>
              <div class="h-full min-h-[300px] relative">
                <app-code-editor [code]="dynamicCode" [language]="'typescript'"></app-code-editor>
              </div>
            </div>

          </div>
        </div>

        <!-- Page Navigation -->
        <div class="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <a routerLink="/docs/get-started" class="!no-underline group flex flex-col items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><i class="bi bi-chevron-left text-[10px]"></i> Previous</span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Overview</span>
          </a>

          <a routerLink="/demos" class="!no-underline group flex flex-col items-end px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 text-right">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">Next <i class="bi bi-chevron-right text-[10px]"></i></span>
            <span class="text-slate-900 dark:text-slate-200 font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">API Demos</span>
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

// 2. Create session and monitor download\n`;

    if (optionsStr) {
      code += `const options = {
  ...(${optionsStr}),
  monitor(m) {
    m.addEventListener("downloadprogress", (e) => {
      console.log("Downloading: " + Math.round(e.loaded * 100) + "%");
    });
  }
};\n`;
    } else {
      code += `const options = {
  monitor(m) {
    m.addEventListener("downloadprogress", (e) => {
      console.log("Downloading: " + Math.round(e.loaded * 100) + "%");
    });
  }
};\n`;
    }

    code += `\nconst session = await ${this.apiChoice}.create(options);
console.log("${this.apiChoice} model is ready!");
`;
    
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
