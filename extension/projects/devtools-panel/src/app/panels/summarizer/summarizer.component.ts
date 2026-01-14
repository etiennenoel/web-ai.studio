import { Component, OnInit, ChangeDetectorRef, NgZone, Inject } from '@angular/core';
import { SummarizerDataService } from '../../services/summarizer-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';
import { SummarizerManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';

@Component({
  selector: 'app-summarizer',
  templateUrl: './summarizer.component.html',
  styleUrls: ['./summarizer.component.scss'],
  standalone: false
})
export class SummarizerComponent implements OnInit {
  history: HistoryItem[] = [];
  inputText = '';
  selectedType = 'tldr';
  selectedFormat = 'plain-text';
  
  isCodeViewerVisible = false;
  summaryResult = 'Output will appear here...';
  latency = '0ms';
  isSummarizing = false;

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }

  constructor(
    private summarizerDataService: SummarizerDataService,
    private toastService: ToastService,
    private summarizerManager: SummarizerManager,
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
      const result = await this.summarizerManager.getStatus();
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
    this.history = await this.summarizerDataService.getHistory();
  }

  get codeSnippet(): string {
    return this.summarizerManager.getCodeSnippet(this.selectedType, this.inputText);
  }

  toggleCodeViewer() {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode() {
    navigator.clipboard.writeText(this.codeSnippet).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  async summarize() {
    if (!this.inputText.trim()) return;

    this.isSummarizing = true;
    this.summaryResult = '';
    const start = performance.now();

    try {
      // @ts-ignore
      if (!window.Summarizer) {
        throw new Error('Summarizer API not supported.');
      }
      // @ts-ignore
      const summarizer = await window.Summarizer.create({ type: this.selectedType });
      
      // @ts-ignore
      const stream = await summarizer.summarizeStreaming(this.inputText);

      this.summaryResult = '';
      for await (const chunk of stream) {
        this.ngZone.run(() => {
          this.summaryResult += chunk;
          this.cdr.detectChanges();
        });
      }
      
      this.ngZone.run(() => {
        this.latency = `${Math.round(performance.now() - start)}ms`;
      });
    } catch (error: any) {
      this.ngZone.run(() => {
        this.summaryResult = `Error: ${error.message}`;
        this.latency = '0ms';
      });
    } finally {
      this.ngZone.run(() => {
        this.isSummarizing = false;
        this.cdr.detectChanges();
      });
    }
  }
}
