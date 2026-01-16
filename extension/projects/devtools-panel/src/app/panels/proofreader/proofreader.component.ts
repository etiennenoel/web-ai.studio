import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { ProofreaderDataService } from '../../services/proofreader-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { ToastService } from 'base';
import { ProofreaderManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';

@Component({
  selector: 'app-proofreader',
  templateUrl: './proofreader.component.html',
  styleUrls: ['./proofreader.component.scss'],
  standalone: false
})
export class ProofreaderComponent implements OnInit {
  history: HistoryItem[] = [];
  inputText = '';
  
  isCodeViewerVisible = false;
  proofreaderOutput = 'Output will appear here...';
  isProofreading = false;

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }

  constructor(
    private proofreaderDataService: ProofreaderDataService,
    private toastService: ToastService,
    private proofreaderManager: ProofreaderManager,
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
      const result = await this.proofreaderManager.getStatus();
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
    this.history = await this.proofreaderDataService.getHistory();
  }

  private _generatedCode: string = '';

  get codeSnippet(): string {
    return this._generatedCode;
  }

  updateGeneratedCode() {
    this._generatedCode = this.proofreaderManager.getCodeSnippet(this.inputText);
  }

  toggleCodeViewer() {
    this.isCodeViewerVisible = !this.isCodeViewerVisible;
  }

  copyCode() {
    navigator.clipboard.writeText(this.codeSnippet).then(() => {
      this.toastService.show('Code copied to clipboard.');
    });
  }

  async proofread() {
    if (!this.inputText.trim()) return;

    this.isProofreading = true;
    this.proofreaderOutput = 'Proofreading...';
    this.cdr.detectChanges(); // Ensure UI updates immediately

    try {
      const proofreader = await this.proofreaderManager.create();
      const result = await proofreader.proofread(this.inputText);
      
      this.proofreaderOutput = result.correctedInput;
      proofreader.destroy();
    } catch (error: any) {
      this.proofreaderOutput = `Error: ${error.message}`;
    } finally {
      this.isProofreading = false;
      this.cdr.detectChanges();
    }
  }
}
