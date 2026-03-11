import { Component, OnInit, ChangeDetectorRef, signal, WritableSignal, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { APP_VERSION } from 'base';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  appVersion = APP_VERSION;
  chromeVersion: number | undefined;
  isAiApiAvailable = false;
  isAiModelAvailable = false;

  downloadProgress: WritableSignal<number> = signal(0);
  public downloadStatus: WritableSignal<'unknown' | 'downloadable' | 'downloading' | 'available' | 'error'> = signal('downloadable');

  isSettingsRoute = false;
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private cdr: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.isSettingsRoute = event.urlAfterRedirects.includes('/settings');
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
