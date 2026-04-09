import { Injectable, Inject, PLATFORM_ID, ApplicationRef } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { first, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private updateAvailable = false;
  private lastCheckTime = 0;
  private readonly MIN_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  init() {
    if (!isPlatformBrowser(this.platformId) || !this.swUpdate.isEnabled) return;

    this.listenForUpdates();
    this.checkOnStable();
    this.checkOnTabFocus();
    this.checkOnNavigation();
  }

  private listenForUpdates() {
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable = true;
        this.showUpdatePrompt();
      }
    });
  }

  private checkThrottled() {
    if (this.updateAvailable) return;
    const now = Date.now();
    if (now - this.lastCheckTime < this.MIN_CHECK_INTERVAL_MS) return;
    this.lastCheckTime = now;
    this.swUpdate.checkForUpdate();
  }

  private checkOnStable() {
    this.appRef.isStable.pipe(first((stable) => stable)).subscribe(() => {
      this.lastCheckTime = Date.now();
      this.swUpdate.checkForUpdate();
    });
  }

  private checkOnTabFocus() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkThrottled();
      }
    });
  }

  private checkOnNavigation() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.checkThrottled());
  }

  private showUpdatePrompt() {
    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.innerHTML = `
      <div style="
        position: fixed; bottom: 24px; right: 24px; z-index: 10000;
        display: flex; align-items: center; gap: 12px;
        padding: 14px 20px;
        background: #1e293b; color: #f1f5f9;
        border: 1px solid #334155; border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        font-family: system-ui, -apple-system, sans-serif; font-size: 13px;
        animation: slideUp 0.3s ease-out;
      ">
        <style>
          @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          #sw-update-banner button:hover { opacity: 0.85; }
        </style>
        <i class="bi bi-arrow-repeat" style="font-size: 16px; color: #818cf8;"></i>
        <span>A new version is available.</span>
        <button id="sw-update-reload" style="
          padding: 6px 14px; background: #6366f1; color: white;
          border: none; border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
        ">Reload</button>
        <button id="sw-update-dismiss" style="
          padding: 4px; background: none; border: none; color: #64748b;
          cursor: pointer; font-size: 16px; line-height: 1;
        ">&times;</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('sw-update-reload')!.addEventListener('click', () => {
      this.swUpdate.activateUpdate().then(() => document.location.reload());
    });

    document.getElementById('sw-update-dismiss')!.addEventListener('click', () => {
      banner.remove();
    });
  }
}
