import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DesignService {
  private readonly STORAGE_KEY = 'webai_design_mode';
  isBeta = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkDesignMode();
    }
  }

  private checkDesignMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const designParam = urlParams.get('design');

    if (designParam === 'beta') {
      this.isBeta = true;
      localStorage.setItem(this.STORAGE_KEY, 'beta');
    } else if (localStorage.getItem(this.STORAGE_KEY) === 'beta') {
      this.isBeta = true;
    }
  }
}
