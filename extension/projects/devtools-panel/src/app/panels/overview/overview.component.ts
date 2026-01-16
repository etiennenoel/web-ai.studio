import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AiModelDataService } from '../../services/ai-model-data.service';
import { ApiAvailability } from '../../interfaces/data/api-availability.interface';
import { RecentActivity } from '../../interfaces/data/recent-activity.interface';
import { Router } from '@angular/router';
import {
    ModelManager,
    WriterManager,
    RewriterManager,
    PromptManager,
    ProofreaderManager,
    SummarizerManager,
    TranslatorManager,
    LanguageDetectorManager
} from 'base';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  standalone: false
})
export class OverviewComponent implements OnInit {

  // System Status
  modelStatusText = 'Checking...';
  modelVariant = '-';
  modelStatusClass = 'bg-gray-500';

  vramUsage = '-';
  storageTotal = '-';
  storageModels = '-';
  storagePacks = '-';

  // API Grid
  apiCapabilities: ApiAvailability[] = [];
  activeDownloads = new Map<string, { controller: AbortController, progress: number }>();

  // Activity
  recentActivities: RecentActivity[] = [];

  // Playground
  chatHistory: { text: string, role: 'user' | 'model', isError?: boolean }[] = [];
  quickPrompt = '';
  isPlaygroundCollapsed = false;

  subscriptions: Subscription[] = [];

  constructor(
    private aiModelData: AiModelDataService,
    private router: Router,
    private cdr: ChangeDetectorRef,
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
    this.modelManager.modelDownloadedEvent.subscribe(value => {
      this.refresh();
    });

    this.refresh();
  }

  async refresh() {
    await Promise.all([
      this.updateModelStatus(),
      this.updateSystemStatus(),
      this.updateApiGrid(),
      this.updateRecentActivity()
    ]);
  }

  async updateModelStatus() {
    const models = await this.aiModelData.getModels();
    const availableModel = models.find(m => m.status === 'available');
    const downloadingModel = models.find(m => m.status === 'downloading');

    if (availableModel) {
        this.modelStatusText = 'Ready';
        this.modelVariant = availableModel.name;
        this.modelStatusClass = 'bg-green-400';
    } else if (downloadingModel) {
        this.modelStatusText = 'Downloading...';
        this.modelVariant = downloadingModel.name;
        this.modelStatusClass = 'bg-blue-400 animate-pulse';
    } else {
        this.modelStatusText = 'Not Available';
        this.modelVariant = '-';
        this.modelStatusClass = 'bg-gray-500';
    }
  }

  async updateSystemStatus() {
    const status = await this.aiModelData.getSystemStatus();
    this.vramUsage = status.vramUsage;

    const storage = await this.aiModelData.getStorageStats();
    this.storageTotal = storage.totalSize;
    this.storageModels = storage.modelsSize;
    this.storagePacks = storage.languagePacksSize;
  }

  async updateApiGrid() {
    this.apiCapabilities = await this.aiModelData.getApiAvailability();
    this.cdr.detectChanges()
  }

  async updateRecentActivity() {
    this.recentActivities = await this.aiModelData.getRecentActivity();
  }

  navigateToTab(tabId: string) {
    this.router.navigate(['/', tabId]);
  }

  togglePlayground() {
    this.isPlaygroundCollapsed = !this.isPlaygroundCollapsed;
  }

  clearPlayground() {
    this.chatHistory = [];
  }

  async handleQuickPrompt() {
    if (!this.quickPrompt.trim()) return;

    const prompt = this.quickPrompt;
    this.quickPrompt = '';

    this.chatHistory.push({ text: prompt, role: 'user' });

    // Add temporary loading message
    const loadingMsg = { text: 'Thinking...', role: 'model' as const, isError: false };
    this.chatHistory.push(loadingMsg);

    try {
        // @ts-ignore
        if (!window.LanguageModel) {
            throw new Error('Language Model API not supported in this browser.');
        }
        // @ts-ignore
        const session = await window.LanguageModel.create();
        const response = await session.prompt(prompt);

        // Update loading message
        loadingMsg.text = response;
    } catch (error: any) {
        loadingMsg.text = `Error: ${error.message || 'Unknown error'}`;
        loadingMsg.isError = true;
    }

    this.cdr.detectChanges(); // Ensure view updates
  }

  // Helper for template to get badge classes
  getBadgeClass(status: string): string {
    switch (status) {
        case 'available':
        case 'readily':
            return 'bg-[#1e3a2a] text-[#4ade80] border-[#14532d]';
        case 'downloading':
        case 'downloadable':
        case 'after-download':
            return 'bg-blue-900/30 text-blue-400 border-blue-800';
        case 'unavailable':
        case 'error':
            return 'bg-red-900/30 text-red-400 border-red-800';
        default:
            return 'bg-gray-700 text-gray-400 border-gray-600';
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
     this.cdr.detectChanges();

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
                 // Prompt uses createSession for consistency with my previous update
                 result = await this.promptManager.createSession(options);
                 break;
             case 'proofreader':
                 result = await this.proofreaderManager.create(options);
                 break;
             case 'summarizer':
                 result = await this.summarizerManager.create(options);
                 break;
             case 'translator':
                 // Translator requires source/target language, maybe just try default or fail gracefully if required
                 // For setup purposes, we might need a dialog or default config.
                 // Assuming availability check covers download without specific languages for base model?
                 // The explainer says: "create() ... can cause downloads".
                 // Translator.create requires options.
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
         this.refresh();

     } catch (e: any) {
         if (e.name === 'AbortError') {
             console.log('Download aborted');
         } else {
             console.error('Download failed', e);
         }
         this.activeDownloads.delete(apiId);
         this.cdr.detectChanges();
     }
  }

  handleAbort(apiId: string) {
      const download = this.activeDownloads.get(apiId);
      if (download) {
          download.controller.abort();
          this.activeDownloads.delete(apiId);
          this.cdr.detectChanges();
      }
  }
}
