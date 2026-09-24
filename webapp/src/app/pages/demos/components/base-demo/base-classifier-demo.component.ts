import { Directive, inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from './base-demo.component';
import { ClassifierService, ClassifierSchema } from '../../../../core/services/classifier.service';

declare const Writer: any;
declare const Rewriter: any;
declare const Summarizer: any;

@Directive()
export abstract class BaseClassifierDemoComponent extends BaseDemoComponent {
  protected readonly classifierService = inject(ClassifierService);
  protected readonly cdr = inject(ChangeDetectorRef);

  classifierStatus: string = 'loading...';
  writerStatus: string = 'loading...';
  rewriterStatus: string = 'loading...';
  summarizerStatus: string = 'loading...';

  errorMessage = '';
  downloadProgress = 0;
  isDownloading = false;

  async checkClassifierAvailability(schema?: ClassifierSchema) {
    if (isPlatformServer(this.platformId)) return;
    this.classifierStatus = await this.classifierService.availability(schema);
    this.cdr.detectChanges();
  }

  async checkWriterAvailability() {
    if (isPlatformServer(this.platformId)) return;
    try {
      this.writerStatus = 'Writer' in self ? await Writer.availability() : 'unavailable';
    } catch {
      this.writerStatus = 'unavailable';
    }
    this.cdr.detectChanges();
  }

  async checkRewriterAvailability() {
    if (isPlatformServer(this.platformId)) return;
    try {
      this.rewriterStatus = 'Rewriter' in self ? await Rewriter.availability() : 'unavailable';
    } catch {
      this.rewriterStatus = 'unavailable';
    }
    this.cdr.detectChanges();
  }

  async checkSummarizerAvailability() {
    if (isPlatformServer(this.platformId)) return;
    try {
      this.summarizerStatus = 'Summarizer' in self ? await Summarizer.availability() : 'unavailable';
    } catch {
      this.summarizerStatus = 'unavailable';
    }
    this.cdr.detectChanges();
  }

  protected onDownloadProgress = (loaded: number) => {
    this.isDownloading = loaded < 1;
    this.downloadProgress = Math.round(loaded * 100);
    if (loaded >= 1) this.classifierStatus = 'available';
    this.cdr.detectChanges();
  };
}
