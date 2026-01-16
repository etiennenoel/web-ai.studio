import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-code-editor',
  template: '<div #editor style="width: 100%; height: 100%;"></div>',
  styles: [':host { display: block; }'],
  standalone: false
})
export class CodeEditorComponent implements AfterViewInit, OnChanges {
  @ViewChild('editor') private editorRef!: ElementRef<HTMLElement>;
  @Input() code: string = '';
  @Input() height: string = '400px';
  @Input() language: string = 'typescript';

  private editor: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const ace = (await import('ace-builds')).default;
      ace.config.set('basePath', 'https://unpkg.com/ace-builds@1.4.12/src-noconflict');
      this.editor = ace.edit(this.editorRef.nativeElement);
      this.editor.setTheme('ace/theme/chrome');
      this.editor.session.setMode(`ace/mode/${this.language}`);
      this.editor.setValue(this.code, -1);
      this.editor.setReadOnly(true);
      this.editorRef.nativeElement.style.height = this.height;
    }
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
}
