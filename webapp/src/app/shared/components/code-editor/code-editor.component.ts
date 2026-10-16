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
  @Input() darkTheme: boolean = false;
  @Input() wrap: boolean = false;
  @Input() foldTemplateLiterals: boolean = false;
  @Output() codeChange = new EventEmitter<string>();

  private ace: any;
  private editor: any;
  private themeObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;
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
      this.ace = ace;
      
      // Dynamically load the modes and themes so they are bundled with webpack 
      // but don't execute in the Node SSR environment
      await import('ace-builds/src-noconflict/mode-javascript');
      await import('ace-builds/src-noconflict/mode-typescript');
      await import('ace-builds/src-noconflict/mode-json');
      await import('ace-builds/src-noconflict/mode-markdown');
      await import('ace-builds/src-noconflict/theme-chrome');
      await import('ace-builds/src-noconflict/theme-one_dark');

      this.editor = ace.edit(this.editorRef.nativeElement);
      
      this.updateTheme();
      this.editor.session.setMode(`ace/mode/${this.language}`);
      this.setupTemplateLiteralFolding();
      this.editor.session.setUseWrapMode(this.wrap);
      this.editor.setValue(this.code, -1);
      this.applyDefaultTemplateLiteralFolds();
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

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.editor) {
            this.editor.resize();
          }
        });
        this.resizeObserver.observe(this.editorRef.nativeElement);
      }
    }
  }

  private updateTheme() {
    if (!this.editor) return;
    const isDark = this.darkTheme || document.documentElement.getAttribute('data-bs-theme') === 'dark';
    // 'one_dark' or 'twilight' or 'tomorrow_night' are good for dark mode. 'github' or 'chrome' for light mode.
    this.editor.setTheme(isDark ? 'ace/theme/one_dark' : 'ace/theme/chrome');
  }

  private getTemplateLiteralFoldRange(session: any, row: number): any {
    if (!this.ace || !session) return null;
    const line: string = session.getLine(row) || '';
    if (!/^(?:const|let|var)\s+\w+\s*=\s*`/.test(line)) {
      return null;
    }
    const openBacktickCol = line.indexOf('`');
    if (openBacktickCol === -1) return null;

    // Check if the template literal closes on the same line
    const restOfLine = line.slice(openBacktickCol + 1);
    if (/(?:^|[^\\])`;\s*$/.test(restOfLine)) {
      return null;
    }

    const maxRow = session.getLength();
    for (let r = row + 1; r < maxRow; r++) {
      const candidate: string = session.getLine(r) || '';
      if (/(?:^|[^\\])`;\s*$/.test(candidate)) {
        const closeBacktickCol = candidate.lastIndexOf('`');
        if (closeBacktickCol !== -1) {
          return new this.ace.Range(row, openBacktickCol + 1, r, closeBacktickCol);
        }
      }
    }
    return null;
  }

  private setupTemplateLiteralFolding(): void {
    const session = this.editor?.session;
    if (!session) return;

    const attachHooks = () => {
      if (!session.getFoldWidget || (session.getFoldWidget as any).__hasTemplateHook) {
        return;
      }
      const baseGetFoldWidget = session.getFoldWidget.bind(session);
      const baseGetFoldWidgetRange = session.getFoldWidgetRange
        ? session.getFoldWidgetRange.bind(session)
        : () => null;

      const wrappedGetFoldWidget = (row: number) => {
        if (this.getTemplateLiteralFoldRange(session, row)) {
          return 'start';
        }
        return baseGetFoldWidget(row);
      };
      (wrappedGetFoldWidget as any).__hasTemplateHook = true;

      session.getFoldWidget = wrappedGetFoldWidget;
      session.getFoldWidgetRange = (row: number, forceMultiline?: boolean) => {
        const customRange = this.getTemplateLiteralFoldRange(session, row);
        if (customRange) {
          return customRange;
        }
        return baseGetFoldWidgetRange(row, forceMultiline);
      };
      session.foldWidgets = [];
    };

    attachHooks();
    session.on('changeMode', () => {
      attachHooks();
      this.applyDefaultTemplateLiteralFolds();
    });
  }

  private applyDefaultTemplateLiteralFolds(): void {
    if (!this.foldTemplateLiterals || !this.editor?.session || !this.ace) {
      return;
    }
    const session = this.editor.session;
    const maxRow = session.getLength();
    for (let row = 0; row < maxRow; row++) {
      const range = this.getTemplateLiteralFoldRange(session, row);
      if (range) {
        session.addFold('...', range);
        row = range.end.row;
      }
    }
    session.foldWidgets = [];
    this.editor.renderer.updateFull();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.editor && changes['code']) {
      if (this.editor.getValue() !== this.code) {
        this.isInternalChange = true;
        this.editor.setValue(this.code, -1);
        this.applyDefaultTemplateLiteralFolds();
        this.isInternalChange = false;
      }
    }
    if(this.editor && changes['language']) {
      this.editor.session.setMode(`ace/mode/${this.language}`);
      this.setupTemplateLiteralFolding();
    }
    if(this.editor && changes['readOnly']) {
      this.editor.setReadOnly(this.readOnly);
    }
    if (this.editor && changes['darkTheme']) {
      this.updateTheme();
    }
    if (this.editor && changes['wrap']) {
      this.editor.session.setUseWrapMode(this.wrap);
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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.editor) {
      this.editor.destroy();
    }
  }
}
