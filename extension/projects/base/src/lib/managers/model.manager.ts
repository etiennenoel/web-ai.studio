import { Injectable } from "@angular/core";
import {Subject} from 'rxjs';

@Injectable({
  providedIn: "root",
})
export class ModelManager {
  modelDownloadedEvent = new Subject<void>();

    async availability(): Promise<Availability> {
        return Summarizer.availability({ outputLanguage: 'en',}); // We use the Summarizer because that's the API that is GA.
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
