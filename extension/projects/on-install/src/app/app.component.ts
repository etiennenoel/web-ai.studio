import { Component, OnInit, ChangeDetectorRef, signal, WritableSignal } from '@angular/core';
import { APP_VERSION } from 'base';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  appVersion = APP_VERSION;
  chromeVersion: number | undefined;
  isAiApiAvailable = false;
  isAiModelAvailable = false;

  downloadProgress: WritableSignal<number> = signal(0);
  public downloadStatus: WritableSignal<'unknown' | 'downloadable' | 'downloading' | 'available' | 'error'> = signal('downloadable');

  constructor() { }

  async ngOnInit() {
    this.checkAvailability();
  }

  async checkAvailability() {
    // @ts-expect-error
    const status = await Summarizer.availability({ outputLanguage: "en" }); // Using summarizer because it's shipped. 

    this.downloadStatus.set(status);

    if (status === "downloading") {
      this.monitorDownloadProgress();
    }
  }

  async onDownloadGeminiNanoClick() {

    switch (this.downloadStatus()) {
      case 'downloadable':
      case 'error': {
        this.downloadStatus.set('downloading');
        this.downloadProgress.set(0);

        await this.monitorDownloadProgress()
        break;
      }
      case 'downloading':
      case 'unknown':
      case 'available':
        return;
    }
  }

  async monitorDownloadProgress() {
    const self = this;

    // @ts-expect-error
    await Summarizer.create({
      monitor(m: any) {
        m.addEventListener("downloadprogress", (e: any) => {
          self.downloadProgress.set(Math.round(e.loaded * 100));
        });
      },
    })
    this.downloadStatus.set('available');

  }

  reload() {
    window.location.reload();
  }
}
