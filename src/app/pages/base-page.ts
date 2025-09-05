import {Directive, OnDestroy, OnInit} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {BaseComponent} from '../components/base.component';

@Directive()
export abstract class BasePage extends BaseComponent implements OnInit, OnDestroy {
  constructor(
    document: Document,
    protected readonly titleService: Title,
    ) {
    super(document);
  }

  setTitle(title: string) {
    this.titleService.setTitle(title + " | WebAI Studio");
  }
}
