import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeManager {
  private _theme = new BehaviorSubject<string>('dark');
  public theme$ = this._theme.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initTheme();
    }
  }

  get currentTheme(): string {
    return this._theme.value;
  }

  initTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode') || urlParams.get('theme'); // Support both

    let theme = 'dark';

    if (modeParam === 'dark' || modeParam === 'light') {
        theme = modeParam;
        localStorage.setItem('webai_theme', modeParam);
    } else if (modeParam === 'auto') {
        localStorage.removeItem('webai_theme'); // Clear preference to use system
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }
    } else {
        const storedTheme = localStorage.getItem('webai_theme');
        if (storedTheme) {
          theme = storedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          theme = 'dark';
        } else {
          theme = 'light';
        }
    }
    
    this._theme.next(theme);
    this.applyTheme(theme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this._theme.next(newTheme);
    localStorage.setItem('webai_theme', newTheme);
    this.applyTheme(newTheme);
  }

  private applyTheme(theme: string) {
    if (isPlatformBrowser(this.platformId)) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
}
