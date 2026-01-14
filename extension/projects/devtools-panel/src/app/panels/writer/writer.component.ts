import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { WriterDataService } from '../../services/writer-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';
import { WriterManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';

@Component({
  selector: 'app-writer',
  templateUrl: './writer.component.html',
  styleUrls: ['./writer.component.scss'],
  standalone: false
})
export class WriterComponent implements OnInit {
  history: HistoryItem[] = [];
  topic = '';
  sharedContext = '';
  selectedTone = 'formal';
  selectedFormat = 'markdown';
  selectedLength = 'medium';
  
  isCodeViewerVisible = false;
  writerOutput = '// Generated text will appear here';
  isWriting = false;

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }

  constructor(
    private writerDataService: WriterDataService,
    private toastService: ToastService,
    private writerManager: WriterManager,
    private cdr: ChangeDetectorRef,
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
      const result = await this.writerManager.getStatus();
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
    this.history = await this.writerDataService.getHistory();
  }

  get codeSnippet(): string {
    const options = {
        tone: this.selectedTone,
        format: this.selectedFormat,
        length: this.selectedLength,
        sharedContext: this.sharedContext
    };
    return this.writerManager.getCodeSnippet(options, this.topic);
  }

  toggleCodeViewer() {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode() {
    navigator.clipboard.writeText(this.codeSnippet).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  async write() {
    if (!this.topic.trim()) return;

    this.isWriting = true;
    this.writerOutput = 'Writing...';
    this.cdr.detectChanges(); // Ensure UI updates immediately

    try {
      // Use WriterManager to create instance
      const writer = await this.writerManager.create({
        tone: this.selectedTone,
        format: this.selectedFormat,
        length: this.selectedLength,
        sharedContext: this.sharedContext
      });

      // Use streaming if available, else fallback to regular write
      if (writer.writeStreaming) {
          const stream = writer.writeStreaming(this.topic);
          this.writerOutput = '';
          
          for await (const chunk of stream) {
              this.writerOutput += chunk;
              this.cdr.detectChanges();
          }
      } else {
          const result = await writer.write(this.topic);
          this.writerOutput = result;
      }
      
      writer.destroy();
    } catch (error: any) {
      this.writerOutput = `Error: ${error.message}`;
    } finally {
      this.isWriting = false;
      this.cdr.detectChanges();
    }
  }
}
