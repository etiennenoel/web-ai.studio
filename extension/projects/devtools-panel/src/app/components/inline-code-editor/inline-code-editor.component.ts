import { Component, ElementRef, ViewChild, AfterViewInit, Input, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_eighties';

@Component({
  selector: 'app-inline-code-editor',
  templateUrl: './inline-code-editor.component.html',
  standalone: false
})
export class InlineCodeEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  
  @Input() content: string = '';
  @Input() maxLines: number = 30;

  private editor: any;
  private initialized = false;

  ngAfterViewInit() {
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content'] && this.editor) {
      this.editor.setValue(this.content || '', -1);
    }
  }

  private initEditor() {
    if (!this.editorContainer || this.initialized) return;

    (ace.config as any).set('useWorker', false);
    
    this.editor = ace.edit(this.editorContainer.nativeElement);
    this.editor.setTheme('ace/theme/tomorrow_night_eighties');
    this.editor.session.setMode('ace/mode/json');
    this.editor.setValue(this.content || '', -1);
    this.editor.setReadOnly(true);
    
    this.editor.setOptions({
      fontFamily: 'monospace',
      fontSize: '11px',
      showLineNumbers: true,
      showGutter: true,
      wrap: true,
      highlightActiveLine: false,
      highlightGutterLine: false,
      maxLines: this.maxLines,
      minLines: 2
    });

    this.initialized = true;
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  }
}