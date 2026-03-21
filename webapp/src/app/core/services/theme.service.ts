import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme';
  private currentThemeSubject = new BehaviorSubject<Theme>('auto');
  public currentTheme$ = this.currentThemeSubject.asObservable();
  
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initTheme();
    }
  }

  private initTheme(): void {
    const storedTheme = localStorage.getItem(this.THEME_KEY) as Theme | null;
    const initialTheme = storedTheme || 'auto';
    
    this.setTheme(initialTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentThemeSubject.value === 'auto') {
        this.applyThemeToDocument('auto');
      }
    });
  }

  public setTheme(theme: Theme): void {
    if (!this.isBrowser) return;

    this.currentThemeSubject.next(theme);
    if (theme === 'auto') {
      localStorage.removeItem(this.THEME_KEY);
    } else {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    this.applyThemeToDocument(theme);
  }

  private applyThemeToDocument(theme: Theme): void {
    if (!this.isBrowser) return;

    let themeToApply = theme;
    if (theme === 'auto') {
      themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-bs-theme', themeToApply);
  }
}
