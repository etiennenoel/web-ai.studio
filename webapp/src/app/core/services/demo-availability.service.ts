import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {BehaviorSubject} from 'rxjs';
import {DemoApi} from '../models/demo.interface';

export type DemoApiAvailability = 'checking' | 'available' | 'downloadable' | 'downloading' | 'unavailable';

@Injectable({providedIn: 'root'})
export class DemoAvailabilityService {
  private readonly availabilitySubject = new BehaviorSubject<Record<DemoApi, DemoApiAvailability>>({
    'Prompt API': 'checking',
    'Semantic Embedder': 'checking',
    'Web Speech': 'checking',
    'Translator': 'checking',
    'Language Detector': 'checking',
    'Summarizer': 'checking',
    'Writer': 'checking',
    'Rewriter': 'checking',
    'Proofreader': 'checking',
  });

  readonly availability$ = this.availabilitySubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkAll();
    }
  }

  private checkAll(): void {
    this.check('Prompt API', () => (globalThis as any).LanguageModel?.availability());
    this.check('Semantic Embedder', () => (globalThis as any).SemanticEmbedder?.availability());
    this.check('Language Detector', () => (globalThis as any).LanguageDetector?.availability());
    this.check('Summarizer', () => (globalThis as any).Summarizer?.availability());
    this.check('Writer', () => (globalThis as any).Writer?.availability());
    this.check('Rewriter', () => (globalThis as any).Rewriter?.availability());
    this.check('Proofreader', () => (globalThis as any).Proofreader?.availability());

    // Translator availability is per language pair — use a representative one.
    this.check('Translator', () => (globalThis as any).Translator?.availability({
      sourceLanguage: 'en',
      targetLanguage: 'es',
    }));

    // Web Speech: only on-device recognition counts (available() is the gate).
    this.check('Web Speech', () => {
      const SR = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
      return SR?.available?.({langs: ['en-US'], processLocally: true});
    });
  }

  private async check(api: DemoApi, probe: () => Promise<string> | undefined): Promise<void> {
    let result: DemoApiAvailability = 'unavailable';

    try {
      const availability = await probe();
      if (availability === 'available' || availability === 'downloadable' || availability === 'downloading') {
        result = availability;
      }
    } catch {
      result = 'unavailable';
    }

    this.availabilitySubject.next({
      ...this.availabilitySubject.value,
      [api]: result,
    });
  }
}
