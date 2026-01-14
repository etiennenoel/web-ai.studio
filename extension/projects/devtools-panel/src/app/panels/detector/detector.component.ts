import { Component, OnInit, ChangeDetectorRef, NgZone, Inject } from '@angular/core';
import { DetectorDataService } from '../../services/detector-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';
import { LanguageDetectorManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';

@Component({
  selector: 'app-detector',
  templateUrl: './detector.component.html',
  styleUrls: ['./detector.component.scss'],
  standalone: false
})
export class DetectorComponent implements OnInit {
  history: HistoryItem[] = [];
  inputText = '';
  
  isCodeViewerVisible = false;
  detectionResult: any[] = []; // Array of { detectedLanguage, confidence }
  isDetecting = false;
  errorMsg = '';

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }

  constructor(
    private detectorDataService: DetectorDataService,
    private toastService: ToastService,
    private languageDetectorManager: LanguageDetectorManager,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(FEATURE_FLAGS) private featureFlags: FeatureFlags
  ) {}

  ngOnInit() {
    this.checkApiStatus();
    if (this.showHistory) {
      this.loadHistory();
    }
  }

  async checkApiStatus() {
    try {
      const result = await this.languageDetectorManager.getStatus();
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
    }
  }

  async loadHistory() {
    this.history = await this.detectorDataService.getHistory();
  }

  get codeSnippet(): string {
    return this.languageDetectorManager.getCodeSnippet(this.inputText);
  }

  toggleCodeViewer() {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode() {
    navigator.clipboard.writeText(this.codeSnippet).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  async detect() {
    if (!this.inputText.trim()) return;

    this.isDetecting = true;
    this.detectionResult = [];
    this.errorMsg = '';

    try {
      // @ts-ignore
      if (!window.LanguageDetector) {
        throw new Error('LanguageDetector API not supported.');
      }
      
      const result = await this.ngZone.run(async () => {
        // @ts-ignore
        const detector = await window.LanguageDetector.create();
        // @ts-ignore
        return await detector.detect(this.inputText);
      });
      
      // Result is array of { detectedLanguage, confidence }
      this.ngZone.run(() => {
        this.detectionResult = result;
        this.cdr.detectChanges();
      });
    } catch (error: any) {
      this.ngZone.run(() => {
        this.errorMsg = `Error: ${error.message}`;
        this.cdr.detectChanges();
      });
    } finally {
      this.ngZone.run(() => {
        this.isDetecting = false;
        this.cdr.detectChanges();
      });
    }
  }
}
