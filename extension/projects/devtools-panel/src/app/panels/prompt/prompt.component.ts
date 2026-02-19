import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { PromptDataService } from '../../services/prompt-data.service';
import { HistoryItem } from '../../interfaces/data/history-item.interface';
import { PromptManager, ApiCheck, ApiStatus, FEATURE_FLAGS, FeatureFlags } from 'base';

export type ButtonState = 'Idle' | 'Stop' | 'Interject';

@Component({
  selector: 'app-prompt',
  templateUrl: './prompt.component.html',
  styleUrls: ['./prompt.component.scss'],
  standalone: false
})
export class PromptComponent implements OnInit {
  history: HistoryItem[] = [];

  checks: ApiCheck[] = [];
  isApiAvailable = false;
  isWarning = false;
  statusText = 'Checking...';
  errorHtml: string = '';

  // Inputs
  systemPrompt = '';
  promptText = '';
  temperature: number | null = null;
  topK: number | null = null;

  // Output
  response = '';
  isBusy = false;
  executionTime = '';
  generatedCode = '';
  
  private abortController: AbortController | null = null;

  get showHistory(): boolean {
    return this.featureFlags.showHistory;
  }
  
  get buttonState(): ButtonState {
    if (this.isBusy) {
      const hasInput = this.promptText.trim().length > 0;
      return hasInput ? 'Interject' : 'Stop';
    }
    return 'Idle';
  }

  constructor(
    private promptDataService: PromptDataService,
    private promptManager: PromptManager,
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

  stopPrompt() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isBusy = false;
    this.cdr.detectChanges();
  }

  async runPrompt() {
    const btnState = this.buttonState;

    if (btnState === 'Stop') {
      this.stopPrompt();
      this.promptText = ''; 
      return;
    }

    // Special case: If inferencing and prompt is empty, just stop.
    if (this.isBusy && !this.promptText.trim()) {
      this.stopPrompt();
      this.promptText = '';
      return;
    }

    // Interject logic: stop previous, start new
    if (this.isBusy) {
       this.stopPrompt();
    }
    
    if (!this.promptText.trim()) return;

    this.isBusy = true;
    this.response = '';
    this.executionTime = '';
    
    this.abortController = new AbortController();
    const startTime = performance.now();

    try {
      const options: any = {};
      if (this.systemPrompt.trim()) {
        options.initialPrompts = [
            { role: 'system', content: this.systemPrompt }
        ];
      }
      if (this.temperature !== null) options.temperature = this.temperature;
      if (this.topK !== null) options.topK = this.topK;

      const session = await this.promptManager.createSession(options);
      
      const stream = session.promptStreaming(this.promptText, {
        signal: this.abortController.signal
      });
      
      let previousChunk = '';
      for await (const chunk of stream) {
        this.response += chunk;
        this.cdr.detectChanges();
      }

      const endTime = performance.now();
      this.executionTime = `${Math.round(endTime - startTime)}ms`;

      // Save to history
      if (this.showHistory) {
        await this.promptDataService.addHistoryItem({
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          prompt: this.promptText,
          systemPrompt: this.systemPrompt,
          response: this.response,
          tokens: this.response.length,
          latency: this.executionTime,
          status: 'success',
          params: {
              temperature: this.temperature ?? undefined,
              topK: this.topK ?? undefined
          }
        });
        this.loadHistory();
      }
      
      session.destroy();

    } catch (e: any) {
      if (e.name === 'AbortError') {
         // Ignored
      } else {
         this.response = `Error: ${e.message}`;
      }
    } finally {
      this.isBusy = false;
      this.abortController = null;
      this.cdr.detectChanges();
    }
  }

  updateGeneratedCode() {
    const optionsObj: any = {};
    if (this.systemPrompt.trim()) {
       optionsObj.initialPrompts = [{ role: 'system', content: this.systemPrompt }];
    }
    if (this.temperature !== null) optionsObj.temperature = this.temperature;
    if (this.topK !== null) optionsObj.topK = this.topK;

    this.generatedCode = this.promptManager.getCodeSnippet(optionsObj, this.promptText);
  }

  async checkApiStatus() {
    try {
      const result = await this.promptManager.getStatus();
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
    this.history = await this.promptDataService.getHistory();
  }

  exportJson() {
    // TODO: Implement export functionality
    console.log('Export JSON');
  }

  clearHistory() {
    // TODO: Implement clear history
    console.log('Clear History');
  }
}
