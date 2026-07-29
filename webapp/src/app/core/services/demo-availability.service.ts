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
  });

  readonly availability$ = this.availabilitySubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkAll();
    }
  }

  private checkAll(): void {
    this.check('Prompt API', (globalThis as any).LanguageModel);
    this.check('Semantic Embedder', (globalThis as any).SemanticEmbedder);
  }

  private async check(api: DemoApi, globalApi: { availability(): Promise<string> } | undefined): Promise<void> {
    let result: DemoApiAvailability = 'unavailable';

    if (globalApi?.availability) {
      try {
        const availability = await globalApi.availability();
        if (availability === 'available' || availability === 'downloadable' || availability === 'downloading') {
          result = availability;
        }
      } catch {
        result = 'unavailable';
      }
    }

    this.availabilitySubject.next({
      ...this.availabilitySubject.value,
      [api]: result,
    });
  }
}
