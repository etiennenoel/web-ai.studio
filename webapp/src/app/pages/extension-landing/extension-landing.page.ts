import { Component, Inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { BasePage } from '../base-page';

@Component({
  selector: 'app-extension-landing',
  templateUrl: './extension-landing.page.html',
  styleUrls: ['./extension-landing.page.scss'],
  standalone: false
})
export class ExtensionLandingPage extends BasePage implements OnInit {
  activeTab: string = 'overview';

  constructor(
    title: Title,
    @Inject(DOCUMENT) document: Document
  ) {
    super(document, title);
    this.setTitle("Extension");
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }
}
