import {Component, DOCUMENT, Inject, Input, OnInit} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {FormControl} from '@angular/forms';
import {BaseComponent} from '../base.component';
import {WritingAssistanceApiEnum} from '../../core/enums/writing-assistance-api.enum';
import {WritingAssistanceOptions} from '../../core/models/writing-assistance-options.model';

@Component({
  selector: 'app-writing-assistance-code-modal',
  standalone: false,
  templateUrl: './writing-assistance-code-modal.html',
  styleUrl: './writing-assistance-code-modal.scss'
})
export class WritingAssistanceCodeModal extends BaseComponent implements OnInit {
  @Input()
  api!: WritingAssistanceApiEnum;

  @Input()
  options!: WritingAssistanceOptions;

  code: string = "";

  languageFormControl = new FormControl<"typescript" | "javascript">("javascript");

  constructor(
    @Inject(DOCUMENT) document: Document,
    public activeModal: NgbActiveModal,
  ) {
    super(document);
  }

  override ngOnInit() {
    super.ngOnInit();

    this.updateCode();
    this.subscriptions.push(this.languageFormControl.valueChanges.subscribe(() => {
      this.updateCode();
    }));
  }

  updateCode() {
    const isTs = this.languageFormControl.value === "typescript";
    
    let objectName = '';
    let methodName = '';
    let optionsPayload: any = {};
    
    if (this.api === WritingAssistanceApiEnum.SummarizerApi) {
      objectName = 'Summarizer';
      methodName = 'summarize';
      if (this.options.summarizerType) optionsPayload.type = this.options.summarizerType;
      if (this.options.summarizerFormat) optionsPayload.format = this.options.summarizerFormat;
      if (this.options.summarizerLength) optionsPayload.length = this.options.summarizerLength;
    } else if (this.api === WritingAssistanceApiEnum.WriterApi) {
      objectName = 'Writer';
      methodName = 'write';
      if (this.options.writerTone) optionsPayload.tone = this.options.writerTone;
      if (this.options.writerFormat) optionsPayload.format = this.options.writerFormat;
      if (this.options.writerLength) optionsPayload.length = this.options.writerLength;
    } else {
      objectName = 'Rewriter';
      methodName = 'rewrite';
      if (this.options.rewriterTone) optionsPayload.tone = this.options.rewriterTone;
      if (this.options.rewriterFormat) optionsPayload.format = this.options.rewriterFormat;
      if (this.options.rewriterLength) optionsPayload.length = this.options.rewriterLength;
    }

    if (this.options.context && this.options.context.length > 0) {
      optionsPayload.sharedContext = this.options.context;
    }
    
    if (this.options.expectedInputLanguages && this.options.expectedInputLanguages.length > 0) {
      optionsPayload.expectedInputLanguages = this.options.expectedInputLanguages;
    }
    
    if (this.options.expectedContextLanguages && this.options.expectedContextLanguages.length > 0) {
      optionsPayload.expectedContextLanguages = this.options.expectedContextLanguages;
    }
    
    if (this.options.outputLanguage) {
      optionsPayload.outputLanguage = this.options.outputLanguage;
    }

    const optionsStr = Object.keys(optionsPayload).length > 0 ? JSON.stringify(optionsPayload, null, 2).replace(/\n/g, '\n    ') : '';

    this.code = `async function run${objectName}(input${isTs ? ': string' : ''})${isTs ? ': Promise<string>' : ''} {
  // Check if the ${objectName} API is available
  const availability = await ${isTs ? '(self as any).' : ''}${objectName}.availability();

  if (availability === 'unavailable') {
    throw new Error('${objectName} API is not available on this device.');
  }

  if (availability !== 'available') {
    console.log('Model download required. Please wait...');
  }

  // Create the ${objectName.toLowerCase()} instance
  const ${objectName.toLowerCase()} = await ${isTs ? '(self as any).' : ''}${objectName}.create(${optionsStr});

  // Execute
  const result = await ${objectName.toLowerCase()}.${methodName}(input);
  
  return result;
}

// Example usage:
// run${objectName}("The text you want to process...").then(console.log);
`;
  }
}
