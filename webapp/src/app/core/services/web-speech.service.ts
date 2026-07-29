import { Injectable, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SpeechQuality = 'command' | 'dictation' | 'conversation';

export interface SpeechRecognitionConfig {
  lang?: string;
  quality?: SpeechQuality;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  phrases?: { phrase: string; boost: number }[];
}

/**
 * Thin wrapper around the Web Speech API focused on on-device recognition
 * (processLocally: true) with the quality-tier and contextual-biasing explainers.
 */
@Injectable({
  providedIn: 'root'
})
export class WebSpeechService {
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private getRecognitionCtor(): any {
    if (!this.isBrowser) return undefined;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }

  isSupported(): boolean {
    return !!this.getRecognitionCtor();
  }

  private toOptions(config: SpeechRecognitionConfig) {
    return {
      langs: [config.lang ?? 'en-US'],
      processLocally: true,
      quality: config.quality ?? 'dictation'
    };
  }

  /** Availability of ON-DEVICE recognition for the given language and quality tier. */
  async available(config: SpeechRecognitionConfig = {}): Promise<string> {
    const SR = this.getRecognitionCtor();
    if (!SR) return 'unavailable';
    // Without available(), on-device support cannot be guaranteed.
    if (typeof SR.available !== 'function') return 'unavailable';
    try {
      return String(await SR.available(this.toOptions(config)));
    } catch {
      return 'unavailable';
    }
  }

  /** Downloads the on-device model for the given language and quality tier. */
  async install(config: SpeechRecognitionConfig = {}): Promise<boolean> {
    const SR = this.getRecognitionCtor();
    if (!SR || typeof SR.install !== 'function') return false;
    return await SR.install(this.toOptions(config));
  }

  /**
   * Builds a configured recognizer. The caller owns it: bind events (wrapped in
   * NgZone.run for change detection), then call start()/stop()/abort().
   */
  createRecognizer(config: SpeechRecognitionConfig = {}): any {
    const SR = this.getRecognitionCtor();
    if (!SR) throw new Error('SpeechRecognition is not supported in this browser.');

    const recognition = new SR();
    const options = this.toOptions(config);

    // Options dict per the on-device-speech-recognition + quality-levels explainers.
    try { recognition.options = options; } catch {}
    // Backwards compat with the older explainer pattern.
    try { recognition.processLocally = true; } catch {}

    recognition.lang = config.lang ?? 'en-US';
    recognition.continuous = config.continuous ?? false;
    recognition.interimResults = config.interimResults ?? true;
    recognition.maxAlternatives = config.maxAlternatives ?? 1;

    const Phrase = (window as any).SpeechRecognitionPhrase;
    if (config.phrases?.length && Phrase && recognition.phrases) {
      try {
        for (const p of config.phrases) {
          if (p.phrase.trim()) recognition.phrases.push(new Phrase(p.phrase.trim(), p.boost));
        }
      } catch {}
    }

    return recognition;
  }

  supportsContextualBiasing(): boolean {
    return this.isBrowser && !!(window as any).SpeechRecognitionPhrase;
  }

  /**
   * Captures a single utterance and resolves with the final transcript.
   * onInterim receives live partial transcripts. Callbacks run inside the Angular zone.
   */
  listenOnce(config: SpeechRecognitionConfig = {}, onInterim?: (text: string) => void): { result: Promise<string>; abort: () => void } {
    const recognition = this.createRecognizer({ ...config, continuous: false, interimResults: true });

    const result = new Promise<string>((resolve, reject) => {
      let finalTranscript = '';

      recognition.onresult = (event: any) => this.ngZone.run(() => {
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript;
          else interim += transcript;
        }
        if (interim && onInterim) onInterim(interim);
      });

      recognition.onerror = (event: any) => this.ngZone.run(() => {
        reject(new Error(event.error === 'no-speech' ? 'No speech detected.' : event.error));
      });

      recognition.onend = () => this.ngZone.run(() => resolve(finalTranscript.trim()));
    });

    recognition.start();
    return { result, abort: () => { try { recognition.abort(); } catch {} } };
  }
}
