import {Component, Inject, OnInit, Optional, PLATFORM_ID, DOCUMENT} from '@angular/core';
import {BaseComponent} from '../base.component';
import {isPlatformServer} from '@angular/common';
import {Router, NavigationEnd} from '@angular/router';
import { filter } from 'rxjs/operators';
import {RouteEnum} from '../../enums/route.enum';
import {ThemeService, Theme} from '../../core/services/theme.service';

@Component({
  selector: 'webai-studio-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent extends BaseComponent implements OnInit {

  routeEnum!: RouteEnum;
  currentTheme$;
  isDocsExpanded = false;

  constructor(@Inject(DOCUMENT) document: Document,
              @Inject(PLATFORM_ID) private platformId: Object,
              private themeService: ThemeService,
              private router: Router
  ) {
    super(document);
    this.currentTheme$ = this.themeService.currentTheme$;
  }

  override ngOnInit() {
    super.ngOnInit();

    if(isPlatformServer(this.platformId)) {
      return;
    }

    this.determineCurrentActiveRoute(window.location.pathname);

    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: any) => {
        const navEvent = event as NavigationEnd;
        // Extract pathname without query params or hash
        const urlTree = this.router.parseUrl(navEvent.urlAfterRedirects);
        this.determineCurrentActiveRoute('/' + urlTree.root.children['primary']?.segments.map(s => s.path).join('/') || '/');
      })
    );
  }

  setTheme(theme: Theme) {
    this.themeService.setTheme(theme);
  }

  getRouterLink(route: RouteEnum) {
    return route;
  }

  get isDocsActive(): boolean {
    return [
      RouteEnum.Docs,
      RouteEnum.GetStarted,
      RouteEnum.CheckAvailability,
      RouteEnum.TrackingDownload,
      RouteEnum.AbortingOperations,
      RouteEnum.Errors,
      RouteEnum.PromptApi,
      RouteEnum.SummarizerApi,
      RouteEnum.WriterApi,
      RouteEnum.RewriterApi,
      RouteEnum.TranslatorApi,
      RouteEnum.LanguageDetectorApi,
      RouteEnum.ProofreaderApi
    ].includes(this.routeEnum);
  }

  toggleDocs(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isDocsExpanded = !this.isDocsExpanded;
  }

  navigateToDocs() {
    this.router.navigate([this.RouteEnum.Docs]);
  }

  determineCurrentActiveRoute(pathname: string) {
    if (pathname.includes("/demos")) {
      this.routeEnum = RouteEnum.Demos;
      return;
    }

    // Auto-expand docs if we are in the docs section
    if (pathname.includes('/docs')) {
      this.isDocsExpanded = true;
    }

    const pathParts = pathname.split("/");
    const latestPathPart = pathParts[pathParts.length - 1];

    switch (latestPathPart) {
      case "translation":
        this.routeEnum = RouteEnum.Translation;
        break;
      case "writing-assistance":
        this.routeEnum = RouteEnum.WritingAssistance;
        break;
      case "evals":
        this.routeEnum = RouteEnum.Evals;
        break;
      case "cortex":
        this.routeEnum = RouteEnum.Cortex;
        break;
      case "extension":
        this.routeEnum = RouteEnum.Extension;
        break;
      case "docs":
        this.routeEnum = RouteEnum.Docs;
        break;
      case "get-started":
        this.routeEnum = RouteEnum.GetStarted;
        break;
      case "check-availability":
        this.routeEnum = RouteEnum.CheckAvailability;
        break;
      case "tracking-download":
        this.routeEnum = RouteEnum.TrackingDownload;
        break;
      case "aborting-operations":
        this.routeEnum = RouteEnum.AbortingOperations;
        break;
      case "errors":
        this.routeEnum = RouteEnum.Errors;
        break;
      case "prompt-api":
        this.routeEnum = RouteEnum.PromptApi;
        break;
      case "summarizer":
        this.routeEnum = RouteEnum.SummarizerApi;
        break;
      case "writer":
        this.routeEnum = RouteEnum.WriterApi;
        break;
      case "rewriter":
        this.routeEnum = RouteEnum.RewriterApi;
        break;
      case "translator":
        if (pathname.includes('/docs/')) {
          this.routeEnum = RouteEnum.TranslatorApi;
        } else {
          this.routeEnum = RouteEnum.Translation;
        }
        break;
      case "language-detector":
        this.routeEnum = RouteEnum.LanguageDetectorApi;
        break;
      case "proofreader":
        this.routeEnum = RouteEnum.ProofreaderApi;
        break;

      default:
        this.routeEnum = RouteEnum.Chat;
        break;
    }
  }

  protected readonly RouteEnum = RouteEnum;
}
