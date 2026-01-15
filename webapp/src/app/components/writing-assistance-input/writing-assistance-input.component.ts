import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PromptInputStateEnum } from '../../core/enums/prompt-input-state.enum';
import { WritingAssistanceApiEnum } from '../../core/enums/writing-assistance-api.enum';
import { WritingAssistanceOptions } from '../../core/models/writing-assistance-options.model';
import {
  RewriterFormatEnum,
  RewriterLengthEnum,
  RewriterToneEnum,
  SummarizerFormatEnum,
  SummarizerLengthEnum,
  SummarizerTypeEnum,
  WriterFormatEnum,
  WriterLengthEnum,
  WriterToneEnum
} from '../../core/enums/writing-assistance.enums';

@Component({
  selector: 'app-writing-assistance-input',
  templateUrl: './writing-assistance-input.component.html',
  styleUrls: ['./writing-assistance-input.component.scss'],
  standalone: false
})
export class WritingAssistanceInputComponent {
  @Input() state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  @Output() run = new EventEmitter<{ input: string, options: WritingAssistanceOptions }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() apiSelection = new EventEmitter<WritingAssistanceApiEnum>();

  input: string = '';
  selectedApi: WritingAssistanceApiEnum = WritingAssistanceApiEnum.SummarizerApi;
  apis = Object.values(WritingAssistanceApiEnum);

  options: WritingAssistanceOptions = {
    summarizerType: SummarizerTypeEnum.KeyPoints,
    summarizerFormat: SummarizerFormatEnum.Markdown,
    summarizerLength: SummarizerLengthEnum.Medium,
    writerTone: WriterToneEnum.Neutral,
    writerFormat: WriterFormatEnum.Markdown,
    writerLength: WriterLengthEnum.Medium,
    rewriterTone: RewriterToneEnum.AsIs,
    rewriterFormat: RewriterFormatEnum.Markdown,
    rewriterLength: RewriterLengthEnum.AsIs
  };

  // Expose Enums to Template
  WritingAssistanceApiEnum = WritingAssistanceApiEnum;
  SummarizerTypeEnum = SummarizerTypeEnum;
  SummarizerFormatEnum = SummarizerFormatEnum;
  SummarizerLengthEnum = SummarizerLengthEnum;
  WriterToneEnum = WriterToneEnum;
  WriterFormatEnum = WriterFormatEnum;
  WriterLengthEnum = WriterLengthEnum;
  RewriterToneEnum = RewriterToneEnum;
  RewriterFormatEnum = RewriterFormatEnum;
  RewriterLengthEnum = RewriterLengthEnum;

  onRun() {
    if (this.input.trim()) {
      this.run.emit({ input: this.input, options: this.options });
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  onApiChange(api: WritingAssistanceApiEnum) {
    this.selectedApi = api;
    this.apiSelection.emit(api);
  }
}
