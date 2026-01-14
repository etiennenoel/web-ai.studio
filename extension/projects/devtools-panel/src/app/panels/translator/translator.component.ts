import { Component, OnInit, ChangeDetectorRef, NgZone, Inject } from '@angular/core';
import { TranslatorDataService } from '../../services/translator-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';
import { TranslatorManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';
import { TranslatorLanguagePackStatus } from '../../interfaces/data/translator-language-pack-status.interface';

@Component({
  selector: 'app-translator',
  templateUrl: './translator.component.html',
  styleUrls: ['./translator.component.scss'],
  standalone: false
})
export class TranslatorComponent implements OnInit {
  history: HistoryItem[] = [];
  inputText = '';
  sourceLanguage = 'en';
  targetLanguage = 'es';
  
  isCodeViewerVisible = false;
  translationResult = 'Translation will appear here...';
  isTranslating = false;

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  isLanguagePackStatusExpanded = false;
  languagePacksStatus: TranslatorLanguagePackStatus[] = [];

  uniqueSourceLanguages: { code: string; name: string }[] = [];
  uniqueTargetLanguages: { code: string; name: string }[] = [];
  
  selectedPairStatus: ApiStatus = ApiStatus.UNKNOWN;
  selectedPairStatusMessage: string = '';
  isLoadingAvailability: boolean = false;

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }

  private allUniqueLanguageCodes: Set<string> = new Set();

  private readonly LANGUAGE_PAIRS = [
    { source: 'en', target: 'es' },
    { source: 'en', target: 'ja' },
    { source: 'en', target: 'ar' },
    { source: 'en', target: 'bn' },
    { source: 'en', target: 'de' },
    { source: 'en', target: 'fr' },
    { source: 'en', target: 'hi' },
    { source: 'en', target: 'it' },
    { source: 'en', target: 'ko' },
    { source: 'en', target: 'nl' },
    { source: 'en', target: 'pl' },
    { source: 'en', target: 'pt' },
    { source: 'en', target: 'ru' },
    { source: 'en', target: 'th' },
    { source: 'en', target: 'tr' },
    { source: 'en', target: 'vi' },
    { source: 'en', target: 'zh' },
    { source: 'en', target: 'bg' },
    { source: 'en', target: 'cs' },
    { source: 'en', target: 'da' },
    { source: 'en', target: 'el' },
    { source: 'en', target: 'fi' },
    { source: 'en', target: 'hr' },
    { source: 'en', target: 'hu' },
    { source: 'en', target: 'id' },
    { source: 'en', target: 'iw' },
    { source: 'en', target: 'lt' },
    { source: 'en', target: 'no' },
    { source: 'en', target: 'ro' },
    { source: 'en', target: 'sk' },
    { source: 'en', target: 'sl' },
    { source: 'en', target: 'sv' },
    { source: 'en', target: 'uk' },
    { source: 'en', target: 'kn' },
    { source: 'en', target: 'ta' },
    { source: 'en', target: 'te' },
    { source: 'en', target: 'mr' },
  ];

  constructor(
    private translatorDataService: TranslatorDataService,
    private toastService: ToastService,
    private translatorManager: TranslatorManager,
    public cdr: ChangeDetectorRef,
    public ngZone: NgZone,
    @Inject(FEATURE_FLAGS) private featureFlags: FeatureFlags
  ) {}

  ngOnInit() {
    this.checkApiStatus();
    if (this.showHistory) {
      this.loadHistory();
    }
    this.getLanguagePacksStatus();

    // Populate all unique language codes first
    this.LANGUAGE_PAIRS.forEach(pair => {
      this.allUniqueLanguageCodes.add(pair.source);
      this.allUniqueLanguageCodes.add(pair.target);
    });

    // Create a sorted list of language objects with their display names
    const languageDisplayNames: { code: string; name: string }[] = Array.from(this.allUniqueLanguageCodes)
      .map(code => ({
        code: code,
        name: new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.uniqueSourceLanguages = languageDisplayNames;
    this.uniqueTargetLanguages = languageDisplayNames;

    // Set initial values if not already set by user preferences or previous state
    if (!this.sourceLanguage) {
      this.sourceLanguage = 'en'; 
    }
    if (!this.targetLanguage) {
      // Find a target language that is not english by default
      this.targetLanguage = languageDisplayNames.find(lang => lang.code !== 'en')?.code || 'es';
    }
    
    this.checkSelectedPairStatus();
  }

  async checkSelectedPairStatus() {
    if (!this.sourceLanguage || !this.targetLanguage) {
      this.selectedPairStatus = ApiStatus.UNKNOWN;
      this.selectedPairStatusMessage = '';
      return;
    }

    this.isLoadingAvailability = true;
    this.selectedPairStatusMessage = 'Checking availability...';
    this.cdr.detectChanges();

     try {
      const availability = await this.translatorManager.getAvailability({
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage
      });
      this.selectedPairStatus = availability as ApiStatus;

      const source = this.sourceLanguage.toUpperCase();
      const target = this.targetLanguage.toUpperCase();
      this.ngZone.run(() => {
        this.selectedPairStatus = availability as ApiStatus;

        if (this.selectedPairStatus === ApiStatus.AVAILABLE || (this.selectedPairStatus as any) === 'readily') {
          this.selectedPairStatus = ApiStatus.AVAILABLE;
          this.selectedPairStatusMessage = 'Available';
        } else if (this.selectedPairStatus === ApiStatus.DOWNLOADABLE || (this.selectedPairStatus as any) === 'after-download') {
          this.selectedPairStatus = ApiStatus.DOWNLOADABLE;
          this.selectedPairStatusMessage = 'Download Required';
        } else if (this.selectedPairStatus === ApiStatus.DOWNLOADING) {
          this.selectedPairStatusMessage = 'Downloading...';
        } else {
          this.selectedPairStatusMessage = 'Unavailable';
        }
      });
    } catch (e) {
      this.ngZone.run(() => {
        this.selectedPairStatus = ApiStatus.ERROR;
        this.selectedPairStatusMessage = 'Availability Check Failed';
      });
    } finally {
      this.ngZone.run(() => {
        this.isLoadingAvailability = false;
        this.cdr.detectChanges();
      });
    }
  }

  async checkApiStatus() {
    try {
      const result = await this.translatorManager.getStatus();
      this.checks = result.checks;
      this.statusText = result.message;
      this.isApiAvailable = result.status === ApiStatus.AVAILABLE || result.status === ApiStatus.DOWNLOADABLE;
      this.isWarning = result.status === ApiStatus.DOWNLOADABLE;
      this.errorHtml = result.errorHtml || '';
    } catch (e) {
      this.statusText = 'Error Checking Status';
      this.isApiAvailable = false;
      this.isWarning = false;
      this.errorHtml = '<p>An unexpected error occurred while checking API status. Please try reloading the extension.</p>';
    } finally {
      this.cdr.detectChanges();
      this.getLanguagePacksStatus();
    }
  }

  async getLanguagePacksStatus() {
    // If we are already downloading, we don't want to overwrite the progress
    // We only update the status if it's not downloading or if the list is empty
    if (this.languagePacksStatus.length > 0 && this.languagePacksStatus.some(p => p.status === ApiStatus.DOWNLOADING)) {
       // Ideally we should update non-downloading ones, but for simplicity let's skip full refresh if busy
       // Or better, only update those that are not downloading
    }

    const statuses: TranslatorLanguagePackStatus[] = [];
    for (const pair of this.LANGUAGE_PAIRS) {
      // Check if we have an existing status for this pair that is downloading
      const existing = this.languagePacksStatus.find(p => p.sourceLanguage === pair.source && p.targetLanguage === pair.target);
      if (existing && existing.status === ApiStatus.DOWNLOADING) {
          statuses.push(existing);
          continue;
      }

      try {
        const availability = await this.translatorManager.getAvailability({
            sourceLanguage: pair.source,
            targetLanguage: pair.target
        });
        let message = '';
        let status: ApiStatus;

        if (availability === ApiStatus.AVAILABLE) {
          message = 'Available';
          status = ApiStatus.AVAILABLE;
        } else if (availability === ApiStatus.DOWNLOADABLE) {
          message = 'Downloadable';
          status = ApiStatus.DOWNLOADABLE;
        } else if (availability === ApiStatus.DOWNLOADING) {
          message = 'Downloading';
          status = ApiStatus.DOWNLOADING;
        } else {
          message = 'Unavailable';
          status = ApiStatus.UNAVAILABLE;
        }
        statuses.push({ 
            sourceLanguage: pair.source, 
            targetLanguage: pair.target, 
            status, 
            message,
            progress: undefined 
        });
      } catch (e: any) {
        statuses.push({ 
            sourceLanguage: pair.source, 
            targetLanguage: pair.target, 
            status: ApiStatus.ERROR, 
            message: `Error: ${e.message}` 
        });
      }
    }
    this.languagePacksStatus = statuses;
    this.cdr.detectChanges();
  }

  async downloadLanguagePack(pack: TranslatorLanguagePackStatus) {
      if (pack.status !== ApiStatus.DOWNLOADABLE) return;

      const abortController = new AbortController();
      pack.abortController = abortController;
      pack.status = ApiStatus.DOWNLOADING;
      pack.message = 'Downloading...';
      pack.progress = 0;
      this.cdr.detectChanges();

      try {
          await this.translatorManager.create({
              sourceLanguage: pack.sourceLanguage,
              targetLanguage: pack.targetLanguage,
              monitor: (m: any) => {
                m.addEventListener('downloadprogress', (e: any) => {
                    const loaded = e.loaded;
                    const total = 1; // ProgressEvent from this API has total=1 (0-1 range) or unknown
                    let percentage = Math.round(loaded * 100);
                    pack.progress = percentage;
                    this.cdr.detectChanges();
                });
              },
              signal: abortController.signal
          });
          
          pack.status = ApiStatus.AVAILABLE;
          pack.message = 'Available';
          pack.progress = 100;
          this.toastService.show(`Language pack ${pack.sourceLanguage.toUpperCase()} <-> ${pack.targetLanguage.toUpperCase()} downloaded.`, 'success');
      } catch (e: any) {
          if (e.name === 'AbortError') {
              pack.status = ApiStatus.DOWNLOADABLE;
              pack.message = 'Download Cancelled';
              this.toastService.show(`Download for ${pack.sourceLanguage.toUpperCase()} <-> ${pack.targetLanguage.toUpperCase()} cancelled.`, 'info');
          } else {
              pack.status = ApiStatus.ERROR;
              pack.message = 'Download Failed';
              this.toastService.show(`Failed to download language pack: ${e.message}`, 'error');
          }
      } finally {
          pack.abortController = undefined;
          this.cdr.detectChanges();
          // Refresh all statuses to be sure
          this.getLanguagePacksStatus();
      }
  }

  cancelLanguagePackDownload(pack: TranslatorLanguagePackStatus) {
    if (pack.abortController) {
      pack.abortController.abort();
    }
  }

  getLanguageDisplayName(code: string): string {
    const language = this.uniqueSourceLanguages.find(lang => lang.code === code);
    return language ? language.name : code;
  }

  toggleLanguagePackStatus(): void {
    this.isLanguagePackStatusExpanded = !this.isLanguagePackStatusExpanded;
  }

  async loadHistory() {
    this.history = await this.translatorDataService.getHistory();
  }

  get codeSnippet(): string {
    return this.translatorManager.getCodeSnippet(this.sourceLanguage, this.targetLanguage, this.inputText);
  }

  toggleCodeViewer() {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode() {
    navigator.clipboard.writeText(this.codeSnippet).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  async translate() {
    if (!this.inputText.trim()) return;

    this.isTranslating = true;
    this.translationResult = 'Translating...';

    try {
      // @ts-ignore
      if (!window.Translator) {
        throw new Error('Translator API not supported.');
      }

      const availability = await this.translatorManager.getAvailability({
          sourceLanguage: this.sourceLanguage,
          targetLanguage: this.targetLanguage
      });
      
      let monitor;
      if (availability === ApiStatus.DOWNLOADABLE || (availability as any) === 'after-download') {
          monitor = (m: any) => {
            m.addEventListener('downloadprogress', (e: any) => {
                const percentage = Math.round((e.loaded / e.total) * 100);
                this.translationResult = `Downloading model... ${percentage}%`;
                this.cdr.detectChanges();
            });
          };
      }

      // @ts-ignore
      const translator = await window.Translator.create({
        sourceLanguage: this.sourceLanguage,
        targetLanguage: this.targetLanguage,
        monitor
      });
      
      this.translationResult = 'Translating...';
      this.cdr.detectChanges();

      // @ts-ignore
      const result = await translator.translate(this.inputText);
      
      this.translationResult = result;
    } catch (error: any) {
      this.translationResult = `Error: ${error.message}`;
    } finally {
      this.isTranslating = false;
      this.cdr.detectChanges();
      // Update status as it might have changed from downloadable to available
      this.checkSelectedPairStatus();
      this.getLanguagePacksStatus();
    }
  }
}
