import {Component, Inject, OnInit, Optional, PLATFORM_ID, DOCUMENT} from '@angular/core';
import {BaseComponent} from '../base.component';
import {isPlatformServer} from '@angular/common';
import {RouteEnum} from '../../enums/route.enum';
import {WEBAI_STUDIO_BASE_URL} from '../../tokens/base-url.token';

@Component({
  selector: 'webai-studio-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent extends BaseComponent implements OnInit {

  routeEnum!: RouteEnum;

  constructor(@Inject(DOCUMENT) document: Document,
              @Inject(PLATFORM_ID) private platformId: Object,
              @Optional() @Inject(WEBAI_STUDIO_BASE_URL) private readonly baseUrl?: string,
  ) {
    super(document)
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

  getRouterLink(route: RouteEnum) {
    return this.baseUrl + route;
  }

  determineCurrentActiveRoute(pathname: string) {
    const pathParts = pathname.split("/");

    // Get the latest path part
    const latestPathPart = pathParts[pathParts.length - 1];

    switch (latestPathPart) {
      case "translation":
        this.routeEnum = RouteEnum.Translation;
        break;
      case "writing-assistance":
        this.routeEnum = RouteEnum.WritingAssistance;
        break;

      default:
        this.routeEnum = RouteEnum.Chat;
        break;
    }
  }

  protected readonly RouteEnum = RouteEnum;
}
