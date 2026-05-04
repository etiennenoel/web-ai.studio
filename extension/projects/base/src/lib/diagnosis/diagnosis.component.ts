import { Component, ChangeDetectorRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DiagnosisService, ApiDiagnostic } from '../managers/diagnosis.service';
import { Subscription } from 'rxjs';

import { ModelManager } from '../managers/model.manager';
import { WriterManager } from '../managers/writer.manager';
import { RewriterManager } from '../managers/rewriter.manager';
import { PromptManager } from '../managers/prompt.manager';
import { ProofreaderManager } from '../managers/proofreader.manager';
import { SummarizerManager } from '../managers/summarizer.manager';
import { TranslatorManager } from '../managers/translator.manager';
import { LanguageDetectorManager } from '../managers/language-detector.manager';

declare const chrome: any;
declare const window: any;

export interface ApiAvailability {
  id: string;
  name: string;
  description: string;
  status: string;
  icon: string;
  error?: string;
}

@Component({
  selector: 'lib-diagnosis',
  templateUrl: './diagnosis.component.html',
  styleUrls: ['./diagnosis.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class DiagnosisComponent implements OnInit, OnDestroy {
  apis: ApiDiagnostic[] = [];
  isChecking = true;
  hasErrors = false;
  errorHistory: any[] = [];
  groupedErrorHistory: { origin: string; items: any[] }[] = [];
  private subscriptions: Subscription[] = [];

  // Model Status
  modelStatus: string = 'unknown';
  modelProgress: number = 0;
  modelStatusText = 'Checking...';
  modelVariant = '-';
  modelStatusClass = 'bg-gray-300 dark:bg-gray-500';

  // API Grid
  apiCapabilities: ApiAvailability[] = [];
  activeDownloads = new Map<string, { controller: AbortController, progress: number }>();

  get failingApis() {
    return this.apis.filter(api => api.siteStatus === false);
  }

  get workingApis() {
    return this.apis.filter(api => api.siteStatus === true);
  }

  constructor(
    private diagnosisService: DiagnosisService,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private readonly modelManager: ModelManager,
    private writerManager: WriterManager,
    private rewriterManager: RewriterManager,
    private promptManager: PromptManager,
    private proofreaderManager: ProofreaderManager,
    private summarizerManager: SummarizerManager,
    private translatorManager: TranslatorManager,
    private detectorManager: LanguageDetectorManager
  ) {}

  ngOnInit() {
    this.subscriptions.push(
      this.diagnosisService.apis$.subscribe(apis => {
        this.apis = apis;
        this.cdr.detectChanges();
      }),
      this.diagnosisService.isChecking$.subscribe(isChecking => {
        this.isChecking = isChecking;
        this.cdr.detectChanges();
      }),
      this.diagnosisService.errorCount$.subscribe(count => {
        this.hasErrors = count > 0;
        this.cdr.detectChanges();
      }),
      this.diagnosisService.errorHistory$.subscribe(history => {
        this.errorHistory = history;
        if (this.isSidePanel()) {
          const grouped = history.reduce((acc, item) => {
            if (!acc[item.origin]) acc[item.origin] = [];
            acc[item.origin].push(item);
            return acc;
          }, {} as Record<string, any[]>);
          this.groupedErrorHistory = Object.keys(grouped).map(origin => ({
            origin,
            items: grouped[origin]
          }));
        }
        this.cdr.detectChanges();
      })
    );
    
    this.subscriptions.push(
      this.modelManager.modelDownloadedEvent.subscribe(() => {
        this.refreshApis();
      })
    );

    this.runChecks();
    this.refreshApis();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  runChecks() {
    this.diagnosisService.runChecks();
  }

  async refreshApis() {
    const apiAvailabilities: ApiAvailability[] = [];

    const checkAvailability = async (id: string, name: string, description: string, icon: string, apiObj: any, extraOptions?: any) => {
      const cap: ApiAvailability = { id, name, description, status: 'unknown', icon };
      apiAvailabilities.push(cap);
      try {
        if (apiObj) {
          cap.status = await apiObj.availability(extraOptions);
        } else {
          cap.status = 'unavailable';
        }
      } catch (e: any) {
        cap.status = "error";
        cap.error = e.message;
      }
    };

    await checkAvailability('prompt', 'Prompt API', 'Interactive chat', 'fa-solid fa-comments', window.LanguageModel);
    await checkAvailability('summarizer', 'Summarizer API', 'Condense text', 'fa-solid fa-compress', window.Summarizer);
    await checkAvailability('writer', 'Writer API', 'Generate content', 'fa-solid fa-pen-nib', window.Writer);
    await checkAvailability('rewriter', 'Rewriter API', 'Refine text', 'fa-solid fa-wand-magic-sparkles', window.Rewriter);
    await checkAvailability('detector', 'Language Detector', 'Identify languages', 'fa-solid fa-language', window.LanguageDetector);

    let targetLanguage = "es";
    for (const lang of navigator.languages) {
      if (!lang.startsWith("en")) {
        targetLanguage = lang;
        break;
      }
    }
    await checkAvailability('translator', 'Translator API', 'Translate text', 'fa-solid fa-globe', window.Translator, { sourceLanguage: "en", targetLanguage });
    await checkAvailability('proofreader', 'Proofreader API', 'Fix grammar', 'fa-solid fa-check-double', window.Proofreader);

    this.apiCapabilities = apiAvailabilities;

    try {
        this.modelStatus = await this.modelManager.availability();
        if (this.modelStatus === 'available' || this.modelStatus === 'readily' as any) {
            this.modelStatusText = 'Ready';
            this.modelVariant = 'Gemini Nano';
            this.modelStatusClass = 'bg-green-400';
        } else if (this.modelStatus === 'downloading') {
            this.modelStatusText = 'Downloading...';
            this.modelVariant = 'Gemini Nano';
            this.modelStatusClass = 'bg-blue-400 animate-pulse';
        } else if (this.modelStatus === 'downloadable' || this.modelStatus === 'after-download' as any) {
            this.modelStatusText = 'Downloadable';
            this.modelVariant = 'Gemini Nano';
            this.modelStatusClass = 'bg-gray-300 dark:bg-gray-500';
        } else {
            this.modelStatusText = 'Not Available';
            this.modelVariant = '-';
            this.modelStatusClass = 'bg-gray-300 dark:bg-gray-500';
        }
    } catch (e: any) {
        this.modelStatus = 'error';
        this.modelStatusText = 'Error';
        this.modelVariant = '-';
        this.modelStatusClass = 'bg-red-400';
    }

    this.cdr.detectChanges();
  }

  async handleModelDownload() {
    this.modelStatus = 'downloading';
    this.modelStatusText = 'Downloading...';
    this.modelStatusClass = 'bg-blue-400 animate-pulse';
    this.modelProgress = 0;
    this.cdr.detectChanges();

    try {
      await this.modelManager.download((progress: number) => {
        this.modelProgress = progress;
        this.cdr.detectChanges();
      });
      this.modelStatus = 'available';
    } catch (error) {
      console.error('Failed to download base model:', error);
      this.modelStatus = 'error';
    }
    this.refreshApis();
  }

  getBadgeClass(status: string): string {
    switch (status) {
        case 'available':
        case 'readily':
            return 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-800/50 border-0';
        case 'downloading':
        case 'downloadable':
        case 'after-download':
            return 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-800/50 border-0';
        case 'unavailable':
        case 'error':
            return 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-800/50 border-0';
        default:
            return 'bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-400 ring-1 ring-inset ring-gray-600/20 dark:ring-gray-700/50 border-0';
    }
  }

  getBadgeText(cap: ApiAvailability): string {
    const isDownloading = this.activeDownloads.has(cap.id);
    const status = isDownloading ? 'downloading' : cap.status;

    switch (status) {
        case 'available':
        case 'readily':
            return 'Available';
        case 'downloading':
            return 'Downloading...';
        case 'downloadable':
        case 'after-download':
            return 'Downloadable';
        case 'unavailable':
            return 'Unavailable';
        case 'error':
            return `Error: ${cap.error}`;
        default:
            return 'Unknown';
    }
  }

  async handleDownload(apiId: string) {
     if (this.activeDownloads.has(apiId)) return;

     const controller = new AbortController();
     this.activeDownloads.set(apiId, { controller, progress: 0 });
     this.refreshApis();

     try {
         const options = {
             monitor: (m: any) => {
                 m.addEventListener('downloadprogress', (e: any) => {
                     const download = this.activeDownloads.get(apiId);
                     if (download) {
                         download.progress = Math.round(e.loaded * 100);
                         this.cdr.detectChanges();
                     }
                 });
             },
             signal: controller.signal
         };

         let result: any;

         switch (apiId) {
             case 'writer':
                 result = await this.writerManager.create(options);
                 break;
             case 'rewriter':
                 result = await this.rewriterManager.create(options);
                 break;
             case 'prompt':
                 result = await this.promptManager.createSession(options);
                 break;
             case 'proofreader':
                 result = await this.proofreaderManager.create(options);
                 break;
             case 'summarizer':
                 result = await this.summarizerManager.create(options);
                 break;
             case 'translator':
                 result = await this.translatorManager.create({sourceLanguage: 'en', targetLanguage: 'es', ...options});
                 break;
              case 'detector':
                 result = await this.detectorManager.create(options);
                 break;
             default:
                 console.warn(`Unknown API ID: ${apiId}`);
                 throw new Error('Unknown API');
         }

         if (result && typeof result.destroy === 'function') {
             result.destroy();
         }

         this.activeDownloads.delete(apiId);
         this.refreshApis();

     } catch (e: any) {
         if (e.name === 'AbortError') {
             console.log('Download aborted');
         } else {
             console.error('Download failed', e);
         }
         this.activeDownloads.delete(apiId);
         this.refreshApis();
     }
  }

  handleAbort(apiId: string) {
      const download = this.activeDownloads.get(apiId);
      if (download) {
          download.controller.abort();
          this.activeDownloads.delete(apiId);
          this.refreshApis();
      }
  }

  goBack() {
    this.location.back();
  }

  isSidePanel() {
    return typeof chrome !== 'undefined' && !chrome.devtools;
  }
}

