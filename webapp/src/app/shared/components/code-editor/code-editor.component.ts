import { Component, ElementRef, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-code-editor',
  template: `
    <div class="relative w-full h-full group">
      <button 
        type="button" 
        (click)="copyCode()" 
        class="absolute top-3 right-5 z-[50] px-3 py-1.5 rounded-lg bg-slate-100/90 hover:bg-slate-200 dark:bg-[#1e1e1e]/90 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 shadow-sm backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold font-sans cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 opacity-0 group-hover:opacity-100"
        [title]="copyText === 'Copied!' ? 'Copied!' : 'Copy to clipboard'">
        <i class="bi text-sm" [ngClass]="copyText === 'Copied!' ? 'bi-check2-all text-emerald-600 dark:text-emerald-400' : 'bi-clipboard'"></i>
        <span [ngClass]="copyText === 'Copied!' ? 'text-emerald-600 dark:text-emerald-400' : ''">{{ copyText }}</span>
      </button>
      <div #editor style="width: 100%; height: 100%;"></div>
    </div>
  `,
  styles: [':host { display: block; width: 100%; height: 100%; }'],
  standalone: false
})
export class CodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editor') private editorRef!: ElementRef<HTMLElement>;
  @Input() code: string = '';
  @Input() height: string = '400px';
  @Input() language: string = 'typescript';
  @Input() readOnly: boolean = true;
  @Output() codeChange = new EventEmitter<string>();

  private editor: any;
  private themeObserver?: MutationObserver;
  private isInternalChange = false;
  copyText = 'Copy';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  copyCode() {
    navigator.clipboard.writeText(this.code).then(() => {
      this.copyText = 'Copied!';
      setTimeout(() => {
        this.copyText = 'Copy';
      }, 2000);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const ace = (await import('ace-builds')).default;
      
      // Dynamically load the modes and themes so they are bundled with webpack 
      // but don't execute in the Node SSR environment
      await import('ace-builds/src-noconflict/mode-javascript');
      await import('ace-builds/src-noconflict/mode-typescript');
      await import('ace-builds/src-noconflict/mode-json');
      await import('ace-builds/src-noconflict/theme-chrome');
      await import('ace-builds/src-noconflict/theme-one_dark');

      this.editor = ace.edit(this.editorRef.nativeElement);
      
      this.updateTheme();
      this.editor.session.setMode(`ace/mode/${this.language}`);
      this.editor.setValue(this.code, -1);
      this.editor.setReadOnly(this.readOnly);
      
      // Customize standard styles to blend with our UI
      this.editor.container.style.lineHeight = 1.5;
      this.editorRef.nativeElement.style.height = this.height;

      // Watch for user edits
      this.editor.session.on('change', () => {
        if (!this.isInternalChange) {
          this.codeChange.emit(this.editor.getValue());
        }
      });

      // Watch for theme changes
      this.themeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'data-bs-theme') {
            this.updateTheme();
          }
        }
      });
      
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-bs-theme']
      });
    }
  }

  private updateTheme() {
    if (!this.editor) return;
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    // 'one_dark' or 'twilight' or 'tomorrow_night' are good for dark mode. 'github' or 'chrome' for light mode.
    this.editor.setTheme(isDark ? 'ace/theme/one_dark' : 'ace/theme/chrome');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.editor && changes['code']) {
      if (this.editor.getValue() !== this.code) {
        this.isInternalChange = true;
        this.editor.setValue(this.code, -1);
        this.isInternalChange = false;
      }
    }
    if(this.editor && changes['language']) {
      this.editor.session.setMode(`ace/mode/${this.language}`);
    }
    if(this.editor && changes['readOnly']) {
      this.editor.setReadOnly(this.readOnly);
    }
    if (this.editor && changes['height']) {
      this.editorRef.nativeElement.style.height = this.height;
      this.editor.resize();
    }
  }

  ngOnDestroy(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
    if (this.editor) {
      this.editor.destroy();
    }
  }
}
