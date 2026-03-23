import { Component, Inject, OnInit } from '@angular/core';
import { BasePage } from '../base-page';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { DEMOS_DATA } from '../../core/services/demos.data';
import { DemoExample, DemoCategory } from '../../core/models/demo.interface';

@Component({
  selector: 'app-demos-page',
  templateUrl: './demos.page.html',
  styleUrls: ['./demos.page.scss'],
  standalone: false
})
export class DemosPage extends BasePage implements OnInit {
  demos: DemoExample[] = DEMOS_DATA;
  categories: DemoCategory[] = ['Text Input', 'Image Input', 'Audio Input', 'Tools Calling', 'Mix-and-Match'];

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title
  ) {
    super(document, title);
    this.setTitle("Demos");
  }

  getDemosByCategory(category: DemoCategory): DemoExample[] {
    return this.demos.filter(demo => demo.category === category);
  }
}
