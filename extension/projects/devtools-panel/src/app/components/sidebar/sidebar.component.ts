import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PanelTab } from '../../enums/panel-tab.enum';
import { MenuItemConfig } from '../../interfaces/menu-item-config.interface';
import { APP_VERSION, DiagnosisService, ModelManager } from 'base';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent implements OnInit, OnDestroy {
  appVersion = APP_VERSION;
  errorCount$: Observable<number>;

  sidebarWidth = 256;
  isResizingSidebar = false;
  nanoStatusLabel = 'Nano: Checking...';
  nanoDotClass = 'status-gray';
  private subscription: Subscription | null = null;

  readonly menuItems: MenuItemConfig[] = [
    { id: PanelTab.OVERVIEW, label: 'Overview', iconClass: 'fa-solid fa-gauge-high', isApi: false, isManagement: false },
    { id: PanelTab.PERFORMANCE, label: 'Performance', iconClass: 'fa-solid fa-chart-line', isApi: false, isManagement: false },
    { id: PanelTab.DIAGNOSIS, label: 'Diagnosis', iconClass: 'fa-solid fa-stethoscope', isApi: false, isManagement: false },
    { id: PanelTab.HISTORY, label: 'History', iconClass: 'fa-solid fa-clock-rotate-left', isApi: false, isManagement: false },
    { id: PanelTab.SETTINGS, label: 'Settings', iconClass: 'fa-solid fa-gear', isApi: false, isManagement: false },
    { id: PanelTab.MODELS, label: 'Models', iconClass: 'fa-solid fa-layer-group', isApi: false, isManagement: true },
    { id: PanelTab.PROMPT, label: 'Prompt API', iconClass: 'fa-solid fa-terminal', isApi: true, isManagement: false },
    { id: PanelTab.SUMMARIZER, label: 'Summarizer API', iconClass: 'fa-regular fa-file-lines', isApi: true, isManagement: false },
    { id: PanelTab.TRANSLATOR, label: 'Translator API', iconClass: 'fa-solid fa-language', isApi: true, isManagement: false },
    { id: PanelTab.DETECTOR, label: 'Language Detector', iconClass: 'fa-solid fa-magnifying-glass', isApi: true, isManagement: false },
    { id: PanelTab.PROOFREADER, label: 'Proofreader API', iconClass: 'fa-solid fa-check-double', isApi: true, isManagement: false },
    { id: PanelTab.WRITER, label: 'Writer API', iconClass: 'fa-solid fa-pen-nib', isApi: true, isManagement: false },
    { id: PanelTab.REWRITER, label: 'Rewriter API', iconClass: 'fa-solid fa-wand-magic-sparkles', isApi: true, isManagement: false },
    { id: PanelTab.CLASSIFIER, label: 'Classifier API', iconClass: 'fa-solid fa-signs-post', isApi: true, isManagement: false },
  ];

  constructor(
    private diagnosisService: DiagnosisService,
    private modelManager: ModelManager,
    private cdr: ChangeDetectorRef,
  ) {
    this.errorCount$ = this.diagnosisService.errorCount$;
  }

  ngOnInit(): void {
    this.refreshNanoStatus();
    if (this.modelManager?.modelDownloadedEvent) {
      this.subscription = this.modelManager.modelDownloadedEvent.subscribe(() => {
        this.refreshNanoStatus();
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async refreshNanoStatus(): Promise<void> {
    try {
      const status = await this.modelManager.availability();
      if (status === 'available' || (status as string) === 'readily') {
        this.nanoStatusLabel = 'Nano: Ready';
        this.nanoDotClass = 'status-green';
      } else if (status === 'downloadable' || (status as string) === 'after-download') {
        this.nanoStatusLabel = 'Nano: Downloadable';
        this.nanoDotClass = 'status-amber';
      } else if (status === 'downloading') {
        this.nanoStatusLabel = 'Nano: Downloading';
        this.nanoDotClass = 'status-blue';
      } else {
        this.nanoStatusLabel = 'Nano: Unavailable';
        this.nanoDotClass = 'status-red';
      }
    } catch {
      // A failed or timed-out check is not the same as "unavailable".
      this.nanoStatusLabel = 'Nano: Unknown';
      this.nanoDotClass = 'status-gray';
    }
    this.cdr.detectChanges();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizingSidebar) return;
    this.sidebarWidth = Math.max(64, Math.min(event.clientX, 600));
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isResizingSidebar) {
      this.isResizingSidebar = false;
      document.body.style.cursor = 'default';
    }
  }

  startResizeSidebar(event: MouseEvent) {
    this.isResizingSidebar = true;
    document.body.style.cursor = 'ew-resize';
    event.preventDefault();
  }

  get apiItems() { return this.menuItems.filter(item => item.isApi); }
  get managementItems() { return this.menuItems.filter(item => item.isManagement); }
  get nonApiItems() { return this.menuItems.filter(item => !item.isApi && !item.isManagement); }
}
