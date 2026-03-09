import { Component, Inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { BasePage } from '../base-page';

export interface BugItem {
  slug: string;
  title: string;
  status: 'Open' | 'Fixed' | 'WontFix' | 'Investigating';
  crbugUrl?: string;
  reproPath: string;
}

@Component({
  selector: 'app-bugs-page',
  templateUrl: './bugs.page.html',
  styleUrls: ['./bugs.page.scss'],
  standalone: false
})
export class BugsPage extends BasePage implements OnInit {
  bugs: BugItem[] = [
    {
      slug: 'first-create-should-fully-load-the-model',
      title: 'First create() should fully load the model',
      status: 'Open',
      reproPath: '/bugs/first-create-should-fully-load-the-model'
    }
  ];

  constructor(
    title: Title,
    @Inject(DOCUMENT) document: Document
  ) {
    super(document, title);
    this.setTitle("Bugs List");
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }
}
