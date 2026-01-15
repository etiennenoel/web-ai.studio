import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {PromptInputStateEnum} from '../../core/enums/prompt-input-state.enum';
import {WritingAssistanceApiEnum} from '../../core/enums/writing-assistance-api.enum';
import {LocaleEnum} from '../../core/enums/locale.enum';
import {WritingAssistanceOptions} from '../../core/models/writing-assistance-options.model';
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

declare const LanguageModel: any;

@Component({
  selector: 'app-writing-assistance-input',
  templateUrl: './writing-assistance-input.component.html',
  styleUrls: ['./writing-assistance-input.component.scss'],
  standalone: false,
})
export class WritingAssistanceInputComponent implements OnInit {
  
  @Input()
  api: WritingAssistanceApiEnum = WritingAssistanceApiEnum.SummarizerApi;

  @Output()
  run = new EventEmitter<{ input: string, options: WritingAssistanceOptions }>();

  @Output()
  cancel = new EventEmitter<void>();

  @Output()
  apiSelection = new EventEmitter<WritingAssistanceApiEnum>();

  @Output()
  stateChange = new EventEmitter<PromptInputStateEnum>();

  private _state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  @Input()
  get state(): PromptInputStateEnum {
    return this._state;
  }

  set state(value: PromptInputStateEnum) {
    if (this._state === value) {
      return;
    }
    this._state = value;
    this.stateChange.emit(this._state);

    if(value === PromptInputStateEnum.Ready) {
        this.input = "";
    }
  }

  input: string = '';
  
  options: WritingAssistanceOptions = {
    summarizerType: SummarizerTypeEnum.KeyPoints,
    summarizerFormat: SummarizerFormatEnum.Markdown,
    summarizerLength: SummarizerLengthEnum.Medium,
    writerTone: WriterToneEnum.Neutral,
    writerFormat: WriterFormatEnum.Markdown,
    writerLength: WriterLengthEnum.Medium,
    rewriterTone: RewriterToneEnum.AsIs,
    rewriterFormat: RewriterFormatEnum.Markdown,
    rewriterLength: RewriterLengthEnum.AsIs,
    expectedInputLanguages: [],
    expectedContextLanguages: [],
    outputLanguage: LocaleEnum.English // Default
  };

  defaultTemperature = 1;
  maxTemperature = 2;
  maxTopK = 128;
  defaultTopK = 3;

  // Expose Enums
  WritingAssistanceApiEnum = WritingAssistanceApiEnum;
  PromptInputStateEnum = PromptInputStateEnum;
  SummarizerTypeEnum = SummarizerTypeEnum;
  SummarizerFormatEnum = SummarizerFormatEnum;
  SummarizerLengthEnum = SummarizerLengthEnum;
  WriterToneEnum = WriterToneEnum;
  WriterFormatEnum = WriterFormatEnum;
  WriterLengthEnum = WriterLengthEnum;
  RewriterToneEnum = RewriterToneEnum;
  RewriterFormatEnum = RewriterFormatEnum;
  RewriterLengthEnum = RewriterLengthEnum;
  LocaleEnum = LocaleEnum;

  get runBtnTooltip() {
    return "Press ctrl/cmd+enter";
  }

  get settingsActive() {
    return (this.options.context && this.options.context.length > 0) ||
      (this.options.expectedContextLanguages && this.options.expectedContextLanguages.length > 0) ||
      (this.options.expectedInputLanguages && this.options.expectedInputLanguages.length > 0) ||
      this.options.outputLanguage;
  }

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object,
              private modalService: NgbModal) {
  }

  async ngOnInit() {
    if(isPlatformServer(this.platformId)) {
      return;
    }

    try {
        if ('LanguageModel' in self) {
            // const params = await LanguageModel.params();
            // this.maxTemperature = params.maxTemperature;
            // this.maxTopK = params.maxTopK;
            // this.defaultTemperature = params.defaultTemperature;
            // this.defaultTopK = params.defaultTopK;
        }
    } catch (e) {
        // ignore
    }
  }

  async onRunClick() {
    if (this.input.trim()) {
        this.run.emit({ input: this.input, options: this.options });
        // State is handled by parent, but provided code sets it.
        // this.state = PromptInputStateEnum.Inferencing;
    }
  }

  clickOnApi(api: WritingAssistanceApiEnum) {
    this.api = api;
    this.apiSelection.emit(api);
  }

  onStopClick() {
    this.cancel.emit()
    // this.state = PromptInputStateEnum.Ready;
  }
}