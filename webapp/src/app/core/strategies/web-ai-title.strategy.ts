import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_TITLE = 'WebAI Studio';

/**
 * Applies the route `title` on every navigation, suffixed with the site name.
 * Pages may still refine the title afterwards through BasePage.setTitle().
 */
@Injectable({ providedIn: 'root' })
export class WebAiTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle} | ${SITE_TITLE}` : SITE_TITLE);
  }
}
