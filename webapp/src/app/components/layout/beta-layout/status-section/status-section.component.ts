import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ElementRef } from '@angular/core';
import { AiStatusService, AiStatus } from '../../../../core/services/ai-status.service';
import { createIcons, icons } from 'lucide';

interface ApiUiState {
  key: string;
  title: string;
  icon: string;
  description: string;
  color: string; // 'blue', 'purple', etc.
  status: 'checking' | 'readily' | 'after-download' | 'no' | 'downloading';
  statusDetails?: string;
  progress: number;
}

@Component({
  selector: 'app-status-section',
  templateUrl: './status-section.component.html',
  standalone: false
})
export class StatusSectionComponent implements OnInit, AfterViewInit {
  
  apis: ApiUiState[] = [
    { key: 'languageModel', title: 'Language Model', icon: 'terminal', description: 'self.ai.languageModel', color: 'blue', status: 'checking', progress: 0 },
    { key: 'summarizer', title: 'Summarizer', icon: 'file-text', description: 'self.ai.summarizer', color: 'purple', status: 'checking', progress: 0 },
    { key: 'writer', title: 'Writer', icon: 'pen-tool', description: 'self.ai.writer', color: 'pink', status: 'checking', progress: 0 },
    { key: 'rewriter', title: 'Rewriter', icon: 'refresh-cw', description: 'self.ai.rewriter', color: 'orange', status: 'checking', progress: 0 },
    { key: 'proofreader', title: 'Proofreader', icon: 'check-circle', description: 'self.ai.proofreader', color: 'emerald', status: 'checking', progress: 0 }
  ];

  scanning = true;

  constructor(
    private aiStatusService: AiStatusService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.checkAll();
  }

  ngAfterViewInit() {
    this.refreshIcons();
  }

  refreshIcons() {
      setTimeout(() => {
          createIcons({
              icons,
              attrs: {
                class: "lucide" 
              },
              nameAttr: 'data-lucide',
              root: this.elementRef.nativeElement
          });
      });
  }

  async checkAll() {
    this.scanning = true;
    for (const api of this.apis) {
      this.checkApi(api);
    }
    // scanning stays true until individual checks finish? 
    // actually checkApi is async, so loop finishes immediately.
    // We can assume scanning is done when we have results.
    // For visual effect, let's keep scanning badge for a bit or rely on individual loading states.
    setTimeout(() => { this.scanning = false; }, 1000); 
  }

  async checkApi(api: ApiUiState) {
    api.status = 'checking';
    const result = await this.aiStatusService.checkStatus(api.key);
    api.status = result.status as any;
    api.statusDetails = result.details;
    this.cdr.detectChanges();
    this.refreshIcons();
  }

  async downloadModel(api: ApiUiState) {
    api.status = 'downloading';
    api.progress = 0;
    this.cdr.detectChanges();

    try {
      await this.aiStatusService.downloadModel(api.key, (loaded, total) => {
        if (total > 0) {
          api.progress = (loaded / total) * 100;
        }
        this.cdr.detectChanges();
      });
      // After download, re-check status
      await this.checkApi(api);
    } catch (e) {
      api.status = 'no';
      api.statusDetails = 'Download failed: ' + (e as Error).message;
      this.cdr.detectChanges();
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'readily': return 'Ready';
      case 'after-download': return 'Available (Download Required)';
      case 'no': return 'Not Available';
      case 'checking': return 'Checking...';
      case 'downloading': return 'Downloading...';
      default: return status;
    }
  }
}
