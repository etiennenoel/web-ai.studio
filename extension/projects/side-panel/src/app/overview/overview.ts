import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import {
    ModelManager,
    WriterManager,
    RewriterManager,
    PromptManager,
    ProofreaderManager,
    SummarizerManager,
    TranslatorManager,
    LanguageDetectorManager,
    DiagnosisService
} from 'base';

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
  selector: 'app-overview',
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
  standalone: false
})
export class OverviewComponent implements OnInit {
  sessionsByOrigin: { [origin: string]: any[] } = {};
  origins: string[] = [];
  loading = true;

  // System Status
  modelStatus: 'unknown' | 'downloadable' | 'downloading' | 'available' | 'error' = 'unknown';
  modelProgress: number = 0;
  modelStatusText = 'Checking...';
  modelVariant = '-';
  modelStatusClass = 'bg-gray-300 dark:bg-gray-500';

  // API Grid
  apiCapabilities: ApiAvailability[] = [];
  activeDownloads = new Map<string, { controller: AbortController, progress: number }>();
  showDevtoolsInfo = true;
  errorCount$: Observable<number>;

  constructor(
    private cdr: ChangeDetectorRef, 
    private ngZone: NgZone,
    private readonly modelManager: ModelManager,
    private writerManager: WriterManager,
    private rewriterManager: RewriterManager,
    private promptManager: PromptManager,
    private proofreaderManager: ProofreaderManager,
    private summarizerManager: SummarizerManager,
    private translatorManager: TranslatorManager,
    private detectorManager: LanguageDetectorManager,
    private diagnosisService: DiagnosisService
  ) {
    this.errorCount$ = this.diagnosisService.errorCount$;
  }

  ngOnInit(): void {
    this.refreshAll();
    
    this.modelManager.modelDownloadedEvent.subscribe(() => {
      this.refreshApis();
    });

    // Listen for updates from the background script or content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'api_call_logged' || request.action === 'log_api_call') {
          this.ngZone.run(() => {
            // Give the DB a tiny bit of time to actually write before fetching
            setTimeout(() => this.fetchActiveSessions(), 100);
          });
        }
      });
    }
  }

  async refreshAll() {
    this.fetchActiveSessions();
    await this.refreshApis();
  }

  async refreshApis() {
    // For model status we can mock for now or use the first available API's response
    // as a proxy, or just set it based on any api being available.
    // Here we'll do the actual API checks.
    
    const apiAvailabilities: ApiAvailability[] = [];

    // Prompt API
    const prompt: ApiAvailability = { id: 'prompt', name: 'Prompt API', description: 'Interactive chat', status: 'unknown', icon: 'fa-solid fa-comments' };
    apiAvailabilities.push(prompt);
    try {
        if (window.LanguageModel) prompt.status = await window.LanguageModel.availability();
        else prompt.status = 'unavailable';
    } catch (e: any) {
        prompt.status = "error";
        prompt.error = e.message;
    }

    // Summarizer API
    const summarizer: ApiAvailability = { id: 'summarizer', name: 'Summarizer API', description: 'Condense text', status: 'unknown', icon: 'fa-solid fa-compress' };
    apiAvailabilities.push(summarizer);
    try {
        if (window.Summarizer) summarizer.status = await window.Summarizer.availability();
        else summarizer.status = 'unavailable';
    } catch (e: any) {
        summarizer.status = "error";
        summarizer.error = e.message;
    }

    // Writer API
    const writer: ApiAvailability = { id: 'writer', name: 'Writer API', description: 'Generate content', status: 'unknown', icon: 'fa-solid fa-pen-nib' };
    apiAvailabilities.push(writer);
    try {
        if (window.Writer) writer.status = await window.Writer.availability();
        else writer.status = 'unavailable';
    } catch (e: any) {
        writer.status = "error";
        writer.error = e.message;
    }

    // Rewriter API
    const rewriter: ApiAvailability = { id: 'rewriter', name: 'Rewriter API', description: 'Refine text', status: 'unknown', icon: 'fa-solid fa-wand-magic-sparkles' };
    apiAvailabilities.push(rewriter);
    try {
        if (window.Rewriter) rewriter.status = await window.Rewriter.availability();
        else rewriter.status = 'unavailable';
    } catch (e: any) {
        rewriter.status = "error";
        rewriter.error = e.message;
    }

    // Detector API
    const detector: ApiAvailability = { id: 'detector', name: 'Language Detector', description: 'Identify languages', status: 'unknown', icon: 'fa-solid fa-language' };
    apiAvailabilities.push(detector);
    try {
        if (window.LanguageDetector) detector.status = await window.LanguageDetector.availability();
        else detector.status = 'unavailable';
    } catch (e: any) {
        detector.status = "error";
        detector.error = e.message;
    }

    // Translator API
    const translator: ApiAvailability = { id: 'translator', name: 'Translator API', description: 'Translate text', status: 'unknown', icon: 'fa-solid fa-globe' };
    apiAvailabilities.push(translator);
    try {
        let targetLanguage = "es";
        for(const lang of navigator.languages) {
            if(!lang.startsWith("en")) {
                targetLanguage = lang;
                break;
            }
        }
        if (window.Translator) translator.status = await window.Translator.availability({ sourceLanguage: "en", targetLanguage });
        else translator.status = 'unavailable';
    } catch (e: any) {
        translator.status = "error";
        translator.error = e.message;
    }

    // Proofreader API
    const proofreader: ApiAvailability = { id: 'proofreader', name: 'Proofreader API', description: 'Fix grammar', status: 'unknown', icon: 'fa-solid fa-check-double' };
    apiAvailabilities.push(proofreader);
    try {
        if (window.Proofreader) proofreader.status = await window.Proofreader.availability();
        else proofreader.status = 'unavailable';
    } catch (e: any) {
        proofreader.status = "error";
        proofreader.error = e.message;
    }

    this.apiCapabilities = apiAvailabilities;

    // Update general model status using modelManager
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
     this.refreshApis(); // To update status immediately

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

  fetchActiveSessions() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_all_history' }, (response: any) => {
        if (response && response.data) {
          this.ngZone.run(() => {
            this.processHistory(response.data);
          });
        }
      });
    }
  }

  processHistory(history: any[]) {
    // Group by origin
    const grouped: { [origin: string]: any[] } = {};
    for (const item of history) {
      const origin = item.origin || 'Unknown Origin';
      if (!grouped[origin]) {
        grouped[origin] = [];
      }
      grouped[origin].push(item);
    }

    // Now, group by session ID per origin
    const sessionsByOrigin: { [origin: string]: any[] } = {};
    for (const origin of Object.keys(grouped)) {
      const items = grouped[origin];
      const sessionsMap: { [sessionId: string]: any[] } = {};
      for (const item of items) {
        const sid = item.sessionId || item.id;
        if (!sessionsMap[sid]) {
          sessionsMap[sid] = [];
        }
        sessionsMap[sid].push(item);
      }
      
      const sessions = Object.keys(sessionsMap).map(sid => {
        const calls = sessionsMap[sid];
        // sort calls by timestamp
        calls.sort((a, b) => b.timestamp - a.timestamp);
        const latestCall = calls[0];
        const apiName = latestCall.api || 'Unknown API';
        
        return {
          sessionId: sid,
          apiName: apiName,
          calls: calls,
          latestTimestamp: latestCall.timestamp
        };
      });
      
      // sort sessions by latest timestamp
      sessions.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
      
      if (sessions.length > 0) {
        sessionsByOrigin[origin] = sessions;
      }
    }
    
    this.sessionsByOrigin = sessionsByOrigin;
    this.origins = Object.keys(sessionsByOrigin).sort();
    this.loading = false;
    this.cdr.detectChanges();
  }

  clearHistory(origin: string) {
    if (window.confirm(`Are you sure you want to clear all history for ${origin}?`)) {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'clear_api_history', payload: { origin } }, (response: any) => {
          this.ngZone.run(() => {
            this.fetchActiveSessions();
          });
        });
      }
    }
  }

  dismissDevtoolsInfo() {
    this.showDevtoolsInfo = false;
  }
}
