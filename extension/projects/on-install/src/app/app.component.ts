import { Component, OnInit, ChangeDetectorRef, signal, WritableSignal, OnDestroy, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { APP_VERSION, ClassifierManager, findClassifierModelVariant, classifierModelTotalBytes } from 'base';

type ModelDownloadStatus = 'unknown' | 'downloadable' | 'downloading' | 'available' | 'unavailable' | 'error';

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

  // Gemini Nano (probed through the Summarizer API, which is shipped)
  downloadProgress: WritableSignal<number> = signal(0);
  public downloadStatus: WritableSignal<ModelDownloadStatus> = signal('unknown');

  // Classifier polyfill model (served by the extension's offscreen runtime)
  classifierStatus: ModelDownloadStatus = 'unknown';
  classifierProgress = 0;
  classifierModelName = '';
  classifierModelSize = '';
  classifierError = '';
  private classifierRequestId: string | null = null;

  isSettingsRoute = false;
  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private classifierManager: ClassifierManager,
  ) {
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
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async ngOnInit() {
    this.checkAvailability();
    this.refreshClassifierStatus();
    this.subscriptions.push(
      this.classifierManager.modelsChangedEvent.subscribe(() => this.refreshClassifierStatus()),
    );
  }

  /** True once both models have reported a status, so the "all good" dot is not shown while checking. */
  get modelsChecked(): boolean {
    return this.downloadStatus() !== 'unknown' && this.classifierStatus !== 'unknown';
  }

  /** Number of on-device models that still need a download. */
  get missingModelCount(): number {
    const missing = (status: ModelDownloadStatus) => status === 'downloadable' || status === 'error';
    return (missing(this.downloadStatus()) ? 1 : 0) + (missing(this.classifierStatus) ? 1 : 0);
  }

  badgeText(status: ModelDownloadStatus): string {
    switch (status) {
      case 'available': return 'Installed';
      case 'downloadable': return 'Not installed';
      case 'downloading': return 'Downloading';
      case 'unavailable': return 'Unavailable';
      case 'error': return 'Error';
      default: return 'Checking';
    }
  }

  badgeClass(status: ModelDownloadStatus): string {
    switch (status) {
      case 'available': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'downloadable': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
      case 'downloading': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'unavailable':
      case 'error': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  }

  // ---------------------------------------------------------------------------
  // Gemini Nano
  // ---------------------------------------------------------------------------

  async checkAvailability() {
    try {
      // @ts-expect-error
      const status = await Summarizer.availability({ outputLanguage: "en" }); // Using summarizer because it's shipped.
      this.downloadStatus.set(status);
      if (status === "downloading") {
        this.monitorDownloadProgress();
      }
    } catch {
      this.downloadStatus.set('error');
    }
  }

  async onDownloadGeminiNanoClick() {
    switch (this.downloadStatus()) {
      case 'downloadable':
      case 'error': {
        this.downloadStatus.set('downloading');
        this.downloadProgress.set(0);
        await this.monitorDownloadProgress();
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
    try {
      // @ts-expect-error
      await Summarizer.create({
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            self.downloadProgress.set(Math.round(e.loaded * 100));
          });
        },
      });
      this.downloadStatus.set('available');
    } catch {
      this.downloadStatus.set('error');
    }
  }

  // ---------------------------------------------------------------------------
  // Classifier model
  // ---------------------------------------------------------------------------

  async refreshClassifierStatus() {
    if (this.classifierStatus === 'downloading') return;
    try {
      const variantId = await this.classifierManager.getActiveVariantId();
      const variant = findClassifierModelVariant(variantId);
      this.classifierModelName = variant?.name ?? variantId;
      this.classifierModelSize = variant ? `${Math.round(classifierModelTotalBytes(variant) / 1_000_000)} MB` : '';
      this.classifierStatus = await this.classifierManager.availability({});
    } catch (e: any) {
      this.classifierStatus = 'error';
      this.classifierError = e.message;
    }
    this.cdr.detectChanges();
  }

  async downloadClassifierModel() {
    if (this.classifierStatus === 'downloading') return;
    this.classifierStatus = 'downloading';
    this.classifierProgress = 0;
    this.classifierError = '';
    this.cdr.detectChanges();
    const requestId = crypto.randomUUID();
    this.classifierRequestId = requestId;
    try {
      const variantId = await this.classifierManager.getActiveVariantId();
      await this.classifierManager.downloadModel(
        variantId,
        (loaded) => this.ngZone.run(() => {
          this.classifierProgress = Math.round(loaded * 100);
          this.cdr.detectChanges();
        }),
        requestId,
      );
      this.classifierStatus = 'available';
    } catch (e: any) {
      this.classifierStatus = 'error';
      this.classifierError = e.message;
    } finally {
      this.classifierRequestId = null;
      this.cdr.detectChanges();
    }
  }

  reload() {
    window.location.reload();
  }
}
