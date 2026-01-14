import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PromptInputStateEnum } from '../../core/enums/prompt-input-state.enum';
import { PromptRunOptions } from '../../core/models/prompt-run.options';

@Component({
  selector: 'app-prompt-input',
  templateUrl: './prompt-input.component.html',
  styleUrls: ['./prompt-input.component.scss'],
  standalone: false
})
export class PromptInputComponent {
  @Input() state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  @Output() run = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() optionsChange = new EventEmitter<PromptRunOptions>();

  prompt: string = '';
  options: PromptRunOptions = new PromptRunOptions();

  onRun() {
    if (this.prompt.trim()) {
      this.run.emit(this.prompt);
      this.prompt = '';
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  toggleOptions() {
    // Implement options toggle logic if needed, or emit optionsChange
  }
}
