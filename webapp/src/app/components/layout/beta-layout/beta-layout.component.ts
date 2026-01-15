import { Component, Inject, PLATFORM_ID, ViewEncapsulation, AfterViewInit, ElementRef, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { DesignService } from '../../../core/services/design.service';
import { createIcons, icons } from 'lucide';

@Component({
  selector: 'app-beta-layout',
  templateUrl: './beta-layout.component.html',
  styleUrls: ['./beta-layout.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.ShadowDom
})
export class BetaLayoutComponent implements AfterViewInit, OnInit {
  activePage = 'home';
  theme = 'dark';
  promptValue = '';
  promptPlaceholder = 'Ask the on-device model anything...';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public designService: DesignService,
    private elementRef: ElementRef,
    private router: Router
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initTheme();
    }
  }

  ngOnInit() {
      const path = this.router.url.split('?')[0];
      if (path !== '/') {
          this.activePage = 'app';
      }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshIcons();
    }
  }

  refreshIcons() {
    setTimeout(() => {
      // @ts-ignore
      createIcons({
        icons,
        root: this.elementRef.nativeElement.shadowRoot
      });
    });
  }

  navigateTo(pageId: string) {
    this.activePage = pageId;
    if (isPlatformBrowser(this.platformId)) {
        window.scrollTo(0, 0);
    }
    this.refreshIcons();
  }

  initTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode') || urlParams.get('theme'); // Support both

    if (modeParam === 'dark' || modeParam === 'light') {
        this.theme = modeParam;
        localStorage.setItem('webai_theme', modeParam);
    } else if (modeParam === 'auto') {
        localStorage.removeItem('webai_theme'); // Clear preference to use system
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.theme = 'dark';
        } else {
            this.theme = 'light';
        }
    } else {
        const storedTheme = localStorage.getItem('webai_theme');
        if (storedTheme) {
          this.theme = storedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.theme = 'dark';
        } else {
          this.theme = 'light';
        }
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('webai_theme', this.theme);
    this.applyTheme();
  }

  applyTheme() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  runDiagnostics() {
    console.log('Running diagnostics...');
  }
  
  openChat() {
      this.activePage = 'app';
      this.router.navigate(['/']);
  }

  openPage(path: string) {
      this.activePage = 'app';
      this.router.navigate([path]);
  }

  handleGlobalPrompt() {
    if (this.promptValue.trim()) {
        const originalPlaceholder = this.promptPlaceholder;
        this.promptValue = '';
        this.promptPlaceholder = "Message sent to model...";
        setTimeout(() => {
            this.promptPlaceholder = originalPlaceholder;
        }, 2000);
    }
  }

  onPromptInput(event: any) {
      const textarea = event.target;
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
  }

  onPromptKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          this.handleGlobalPrompt();
      }
  }
}