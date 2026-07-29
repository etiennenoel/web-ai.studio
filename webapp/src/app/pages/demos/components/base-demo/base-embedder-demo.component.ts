import { Directive, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from './base-demo.component';
import { SemanticEmbedderService } from '../../../../core/services/semantic-embedder.service';

@Directive()
export abstract class BaseEmbedderDemoComponent extends BaseDemoComponent {
  protected readonly semanticEmbedder = inject(SemanticEmbedderService);

  embedderStatus: string = 'loading...';
  errorMessage = '';

  downloadProgress = 0;
  isDownloading = false;

  async checkEmbedderAvailability() {
    if (isPlatformServer(this.platformId)) return;
    this.embedderStatus = await this.semanticEmbedder.availability();
  }

  get embedderUsable(): boolean {
    return this.embedderStatus === 'available' || this.embedderStatus === 'downloadable' || this.embedderStatus === 'downloading';
  }

  protected onDownloadProgress = (loaded: number) => {
    this.isDownloading = loaded < 1;
    this.downloadProgress = Math.round(loaded * 100);
    if (loaded >= 1) this.embedderStatus = 'available';
  };
}
