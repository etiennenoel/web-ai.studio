import {Component, Inject, OnInit, Optional, PLATFORM_ID, DOCUMENT} from '@angular/core';
import {BaseComponent} from '../base.component';
import {isPlatformServer} from '@angular/common';
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

  constructor(@Inject(DOCUMENT) document: Document,
              @Inject(PLATFORM_ID) private platformId: Object,
              private themeService: ThemeService
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

    // @ts-expect-error
    window.navigation?.addEventListener("navigate", (event: any) => {
      this.determineCurrentActiveRoute((new URL(event.destination.url)).pathname);
    });
  }

  setTheme(theme: Theme) {
    this.themeService.setTheme(theme);
  }

  getRouterLink(route: RouteEnum) {
    return route;
  }

  determineCurrentActiveRoute(pathname: string) {
    if (pathname.includes("/demos")) {
      this.routeEnum = RouteEnum.Demos;
      return;
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
