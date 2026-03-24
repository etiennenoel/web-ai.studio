import { Component, Input, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-docs-section-header',
  template: `
    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
      {{ title }}
      <a [href]="'#' + anchorId" 
         (click)="copyLink($event)" 
         class="text-slate-300 dark:text-zinc-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
         [ngClass]="copied ? '!text-emerald-500' : ''" 
         title="Copy link to this section">
        <i class="bi" [ngClass]="copied ? 'bi-check2' : 'bi-link-45deg'"></i>
      </a>
    </h2>
  `,
  standalone: false
})
export class DocsSectionHeaderComponent {
  @Input() anchorId: string = '';
  @Input() title: string = '';
  copied = false;

  constructor(private cdr: ChangeDetectorRef) {}

  copyLink(event: Event) {
    event.preventDefault();
    const url = window.location.href.split('#')[0] + '#' + this.anchorId;
    navigator.clipboard.writeText(url);
    window.history.pushState(null, '', url);
    
    this.copied = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.copied = false;
      this.cdr.detectChanges();
    }, 2000);
  }
}
