import {Component, DOCUMENT, Inject, Input, OnInit} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import {FormControl} from '@angular/forms';
import {BaseComponent} from '../base.component';
import {PromptManager} from '../../core/services/prompt.manager';
import {PromptRunOptions} from '../../core/models/prompt-run.options';

@Component({
  selector: 'app-prompt-code-modal',
  standalone: false,
  templateUrl: './prompt-code-modal.html',
  styleUrl: './prompt-code-modal.scss'
})
export class PromptCodeModal extends BaseComponent implements OnInit{
  @Input()
  options: PromptRunOptions = new PromptRunOptions();

  code: string = "";


  languageFormControl = new FormControl<"typescript" | "javascript">("typescript");

  constructor(
    @Inject(DOCUMENT) document: Document,
    public dialogRef: DialogRef<PromptCodeModal>,
    @Inject(DIALOG_DATA) public data: { options: PromptRunOptions },
    private readonly promptManager: PromptManager,
    ) {
    super(document);
    if (data && data.options) {
      this.options = data.options;
    }
  }

  override ngOnInit() {
    super.ngOnInit();

    this.subscriptions.push(this.languageFormControl.valueChanges.subscribe(value => {
      this.updateCode();
    }))
  }

  updateCode() {
    this.code = this.promptManager.getCode(this.options, true, this.languageFormControl.value ?? "typescript");
  }
}
