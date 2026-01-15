import { Component, Inject, PLATFORM_ID, ViewEncapsulation, AfterViewInit, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DesignService } from '../../../core/services/design.service';
import { createIcons, icons } from 'lucide';

@Component({
  selector: 'app-beta-layout',
  templateUrl: './beta-layout.component.html',
  styleUrls: ['./beta-layout.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.ShadowDom
})
export class BetaLayoutComponent implements AfterViewInit {
  activePage = 'home';
  activeDoc = 'intro';
  theme = 'dark';
  promptValue = '';
  promptPlaceholder = 'Ask the on-device model anything...';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public designService: DesignService,
    private elementRef: ElementRef
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkTimeAndSetTheme();
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

  navigateTo(pageId: string, docId: string | null = null) {
    this.activePage = pageId;
    if (pageId === 'docs') {
        this.activeDoc = docId || 'intro';
    }
    if (isPlatformBrowser(this.platformId)) {
        window.scrollTo(0, 0);
    }
    this.refreshIcons();
  }

  switchDoc(docId: string) {
      this.activeDoc = docId;
      this.refreshIcons();
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    if (isPlatformBrowser(this.platformId)) {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  checkTimeAndSetTheme() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      this.theme = 'light';
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.classList.remove('dark');
      }
    } else {
      this.theme = 'dark';
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.classList.add('dark');
      }
    }
  }

  runDiagnostics() {
    console.log('Running diagnostics...');
  }
  
  openChat() {
      this.activePage = 'app';
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