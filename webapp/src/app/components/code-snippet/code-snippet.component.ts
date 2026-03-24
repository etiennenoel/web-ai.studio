import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-code-snippet',
  template: `
    <details class="group rounded-xl overflow-hidden mb-8 border border-slate-200 dark:border-zinc-800 bg-[#161616] shadow-sm open:bg-[#161616]">
      <summary class="flex justify-between items-center px-4 py-2.5 bg-slate-50 dark:bg-[#1e1e1e] border-b border-slate-200 dark:border-zinc-800 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80">
        <div class="flex items-center gap-2.5">
          <i class="bi bi-chevron-right text-[10px] text-slate-400 dark:text-zinc-500 transition-transform duration-200 group-open:rotate-90"></i>
          <span class="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Example code</span>
        </div>
        <button (click)="copyCode($event)" 
                class="flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-700/50 transition-colors" 
                title="Copy code">
          <i class="bi text-[13px]" [ngClass]="copied ? 'bi-check2 text-emerald-500 dark:text-emerald-400' : 'bi-clipboard'"></i>
        </button>
      </summary>
      <div class="relative overflow-hidden">
        <pre class="p-4 text-sm text-slate-50 dark:text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed"><code #codeBlock><ng-content></ng-content></code></pre>
      </div>
    </details>
  `,
  standalone: false
})
export class CodeSnippetComponent {
  copied = false;
  @ViewChild('codeBlock') codeBlock!: ElementRef;

  constructor(private cdr: ChangeDetectorRef) {}

  copyCode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const codeText = this.codeBlock.nativeElement.innerText;
    navigator.clipboard.writeText(codeText);
    this.copied = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.copied = false;
      this.cdr.detectChanges();
    }, 2000);
  }
}
