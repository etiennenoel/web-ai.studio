import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { RewriterDataService } from '../../services/rewriter-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';
import { RewriterManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';

@Component({
  selector: 'app-rewriter',
  templateUrl: './rewriter.component.html',
  styleUrls: ['./rewriter.component.scss'],
  standalone: false
})
export class RewriterComponent implements OnInit {
  history: HistoryItem[] = [];
  inputText = '';
  
  isCodeViewerVisible = false;
  rewriterOutput = '// Rewritten result...';
  isRewriting = false;
  
  // Last used options for code snippet
  lastOptions: any = {};
  private _generatedCode: string = ''; // Private field to store generated code

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }

  constructor(
    private rewriterDataService: RewriterDataService,
    private toastService: ToastService,
    private rewriterManager: RewriterManager,
    private cdr: ChangeDetectorRef,
    @Inject(FEATURE_FLAGS) private featureFlags: FeatureFlags
  ) {}

  ngOnInit() {
    this.checkApiStatus();
    if (this.showHistory) {
      this.loadHistory();
    }
    this.updateGeneratedCode(); // Initial code generation
  }

  onInputChange() {
    this.updateGeneratedCode();
  }

  async checkApiStatus() {
    try {
      const result = await this.rewriterManager.getStatus();
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
    this.history = await this.rewriterDataService.getHistory();
  }

  get codeSnippet(): string {
    return this._generatedCode;
  }

  updateGeneratedCode() {
    this._generatedCode = this.rewriterManager.getCodeSnippet(this.lastOptions, this.inputText);
  }

  toggleCodeViewer() {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode() {
    navigator.clipboard.writeText(this.codeSnippet).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  async rewrite(action: 'shorter' | 'longer' | 'professional' | 'casual') {
    if (!this.inputText.trim()) return;

    this.isRewriting = true;
    this.rewriterOutput = 'Rewriting...';
    this.cdr.detectChanges(); // Ensure UI updates immediately
    
    const options: any = {};
    if (action === 'shorter') options.length = 'shorter';
    if (action === 'longer') options.length = 'longer';
    if (action === 'professional') options.tone = 'more-formal';
    if (action === 'casual') options.tone = 'more-casual';
    
    this.lastOptions = options;
    this.updateGeneratedCode(); // Update code snippet with new options

    try {
      const rewriter = await this.rewriterManager.create(options);

      if (rewriter.rewriteStreaming) {
          const stream = rewriter.rewriteStreaming(this.inputText);
          this.rewriterOutput = '';
          
          for await (const chunk of stream) {
              this.rewriterOutput += chunk;
              this.cdr.detectChanges();
          }
      } else {
          const result = await rewriter.rewrite(this.inputText);
          this.rewriterOutput = result;
      }

      rewriter.destroy();
    } catch (error: any) {
      this.rewriterOutput = `Error: ${error.message}`;
    } finally {
      this.isRewriting = false;
      this.cdr.detectChanges();
    }
  }
}
