import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PromptInputStateEnum } from '../../core/enums/prompt-input-state.enum';
import { PromptRunOptions } from '../../core/models/prompt-run.options';

export interface PromptInputEvent {
  prompt: string;
  attachments: File[];
}

@Component({
  selector: 'app-prompt-input',
  templateUrl: './prompt-input.component.html',
  styleUrls: ['./prompt-input.component.scss'],
  standalone: false
})
export class PromptInputComponent {
  @Input() state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  @Output() run = new EventEmitter<PromptInputEvent>();
  @Output() cancel = new EventEmitter<void>();
  @Output() optionsChange = new EventEmitter<PromptRunOptions>();

  prompt: string = '';
  options: PromptRunOptions = new PromptRunOptions();
  
  showOptions = false;
  isRecording = false;
  attachments: File[] = [];

  onRun() {
    if (this.prompt.trim() || this.attachments.length > 0) {
      this.run.emit({
        prompt: this.prompt,
        attachments: this.attachments
      });
      this.prompt = '';
      this.attachments = [];
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  updateOptions() {
    this.optionsChange.emit(this.options);
  }

  toggleRecording() {
    this.isRecording = !this.isRecording;
    // TODO: Implement actual recording logic
    if (this.isRecording) {
      console.log('Recording started...');
    } else {
      console.log('Recording stopped.');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.attachments = [...this.attachments, ...Array.from(input.files)];
    }
    input.value = '';
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  onEnter(event: any) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.onRun();
    }
  }
}
