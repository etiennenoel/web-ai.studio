import { Injectable } from "@angular/core";
import {Subject} from 'rxjs';
import { callModelAvailability } from '../utils/availability.utils';

@Injectable({
  providedIn: "root",
})
export class ModelManager {
  modelDownloadedEvent = new Subject<void>();

    async availability(): Promise<Availability> {
        if (typeof Summarizer === 'undefined' || typeof Summarizer.availability !== 'function') {
          return 'unavailable';
        }
        // We use the Summarizer because that's the API that is GA.
        return callModelAvailability(() => Summarizer.availability({ outputLanguage: 'en' }));
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
