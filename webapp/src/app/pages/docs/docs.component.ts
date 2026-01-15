import { Component, Inject, PLATFORM_ID, AfterViewInit, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { createIcons, icons } from 'lucide';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.scss'],
  standalone: false
})
export class DocsComponent implements AfterViewInit {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private elementRef: ElementRef
  ) {
    // Refresh icons on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo(0, 0);
        this.refreshIcons();
      }
    });
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
        root: this.elementRef.nativeElement
      });
    });
  }

  navigateTo(path: string) {
      this.router.navigate([path]);
  }
}
