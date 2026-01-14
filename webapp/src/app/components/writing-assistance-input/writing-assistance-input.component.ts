import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PromptInputStateEnum } from '../../core/enums/prompt-input-state.enum';
import { WritingAssistanceApiEnum } from '../../core/enums/writing-assistance-api.enum';

@Component({
  selector: 'app-writing-assistance-input',
  templateUrl: './writing-assistance-input.component.html',
  styleUrls: ['./writing-assistance-input.component.scss'],
  standalone: false
})
export class WritingAssistanceInputComponent {
  @Input() state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  @Output() run = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() apiSelection = new EventEmitter<WritingAssistanceApiEnum>();

  input: string = '';
  selectedApi: WritingAssistanceApiEnum = WritingAssistanceApiEnum.SummarizerApi;
  apis = Object.values(WritingAssistanceApiEnum);

  onRun() {
    if (this.input.trim()) {
      this.run.emit(this.input);
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
