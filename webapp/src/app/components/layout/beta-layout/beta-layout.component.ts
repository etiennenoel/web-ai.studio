import { Component, Inject, PLATFORM_ID, ViewEncapsulation, AfterViewInit, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { DesignService } from '../../../core/services/design.service';
import { createIcons, icons } from 'lucide';
import { ThemeManager } from '../../../core/services/theme.manager';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-beta-layout',
  templateUrl: './beta-layout.component.html',
  styleUrls: ['./beta-layout.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.ShadowDom
})
export class BetaLayoutComponent implements AfterViewInit, OnInit, OnDestroy {
  activePage = 'home';
  theme = 'dark';
  promptValue = '';
  promptPlaceholder = 'Ask the on-device model anything...';
  private themeSubscription: Subscription;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public designService: DesignService,
    private elementRef: ElementRef,
    private router: Router,
    private themeManager: ThemeManager,
  ) {
    this.themeSubscription = this.themeManager.theme$.subscribe(theme => {
      this.theme = theme;
    });
  }

  ngOnInit() {
      const path = this.router.url.split('?')[0];
      if (path !== '/') {
          this.activePage = 'app';
      }
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
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
