import { Injectable } from "@angular/core";
import {Subject} from 'rxjs';
import { DEFAULT_AVAILABILITY_TIMEOUT_MS, withAvailabilityTimeout } from '../utils/availability.utils';

@Injectable({
  providedIn: "root",
})
export class ModelManager {
  modelDownloadedEvent = new Subject<void>();

    async availability(): Promise<Availability> {
        if (typeof Summarizer === 'undefined' || typeof Summarizer.availability !== 'function') {
          return 'unavailable';
        }
        return withAvailabilityTimeout(
          Summarizer.availability({ outputLanguage: 'en' }), // We use the Summarizer because that's the API that is GA.
          DEFAULT_AVAILABILITY_TIMEOUT_MS,
          'unavailable',
        );
    }

    async download(progressCallback: (progress: number) => void): Promise<void> {
      await Summarizer.create({
        outputLanguage: 'en',
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            progressCallback(Math.round(e.loaded * 100));
          });
        },
      })

      this.modelDownloadedEvent.next();
    }
}
