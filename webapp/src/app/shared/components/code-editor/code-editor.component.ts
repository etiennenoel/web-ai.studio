import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-code-editor',
  template: '<div #editor style="width: 100%; height: 100%;"></div>',
  styles: [':host { display: block; width: 100%; height: 100%; }'],
  standalone: false
})
export class CodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editor') private editorRef!: ElementRef<HTMLElement>;
  @Input() code: string = '';
  @Input() height: string = '400px';
  @Input() language: string = 'typescript';

  private editor: any;
  private themeObserver?: MutationObserver;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const ace = (await import('ace-builds')).default;
      
      // Dynamically load the modes and themes so they are bundled with webpack 
      // but don't execute in the Node SSR environment
      await import('ace-builds/src-noconflict/mode-javascript');
      await import('ace-builds/src-noconflict/mode-typescript');
      await import('ace-builds/src-noconflict/theme-chrome');
      await import('ace-builds/src-noconflict/theme-one_dark');

      this.editor = ace.edit(this.editorRef.nativeElement);
      
      this.updateTheme();
      this.editor.session.setMode(`ace/mode/${this.language}`);
      this.editor.setValue(this.code, -1);
      this.editor.setReadOnly(true);
      
      // Customize standard styles to blend with our UI
      this.editor.container.style.lineHeight = 1.5;
      this.editorRef.nativeElement.style.height = this.height;

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
        this.editor.setValue(this.code, -1);
      }
    }
    if(this.editor && changes['language']) {
      this.editor.session.setMode(`ace/mode/${this.language}`);
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
