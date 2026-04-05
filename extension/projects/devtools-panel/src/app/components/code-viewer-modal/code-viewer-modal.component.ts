import { Component, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import * as ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_eighties';

@Component({
  selector: 'app-code-viewer-modal',
  templateUrl: './code-viewer-modal.component.html',
  standalone: false
})
export class CodeViewerModalComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  
  @Input() isOpen: boolean = false;
  @Input() title: string = 'JSON Viewer';
  @Input() content: string = '';
  
  @Output() close = new EventEmitter<void>();

  private editor: any;
  private initialized = false;

  ngAfterViewInit() {
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && !this.initialized) {
      // Need to wait for view to be visible
      setTimeout(() => this.initEditor(), 0);
    }
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
      fontSize: '13px',
      showLineNumbers: true,
      showGutter: true,
      wrap: true,
      highlightActiveLine: false,
      highlightGutterLine: false
    });

    this.initialized = true;
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  onClose() {
    this.close.emit();
  }
}