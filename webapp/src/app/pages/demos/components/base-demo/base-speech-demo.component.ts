import { Directive, NgZone, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from './base-demo.component';
import { WebSpeechService, SpeechRecognitionConfig } from '../../../../core/services/web-speech.service';

@Directive()
export abstract class BaseSpeechDemoComponent extends BaseDemoComponent {
  protected readonly webSpeech = inject(WebSpeechService);
  protected readonly ngZone = inject(NgZone);

  speechStatus: string = 'loading...';
  isInstalling = false;
  errorMessage = '';

  protected recognition: any = null;
  isListening = false;

  async checkSpeechAvailability(config: SpeechRecognitionConfig = {}) {
    if (isPlatformServer(this.platformId)) return;
    this.speechStatus = await this.webSpeech.available(config);
  }

  async installSpeechModel(config: SpeechRecognitionConfig = {}) {
    this.isInstalling = true;
    this.errorMessage = '';
    try {
      const installed = await this.webSpeech.install(config);
      if (installed) {
        this.speechStatus = 'available';
      } else {
        this.errorMessage = 'The on-device speech model could not be installed.';
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Installation failed.';
    } finally {
      this.isInstalling = false;
    }
  }

  protected stopRecognition() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
  }

  protected abortRecognition() {
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  override ngOnDestroy() {
    this.abortRecognition();
    super.ngOnDestroy();
  }
}
