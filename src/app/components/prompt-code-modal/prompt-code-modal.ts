import {Component, DOCUMENT, Inject, Input, OnInit} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {FormControl} from '@angular/forms';
import {MagienoBaseComponent} from '@magieno/angular-core';
import {PromptManager, PromptRunOptions} from '@magieno/angular-ai';

@Component({
  selector: 'app-prompt-code-modal',
  standalone: false,
  templateUrl: './prompt-code-modal.html',
  styleUrl: './prompt-code-modal.scss'
})
export class PromptCodeModal extends MagienoBaseComponent implements OnInit{
  @Input()
  options: PromptRunOptions = new PromptRunOptions();

  code: string = "";


  languageFormControl = new FormControl<"typescript" | "javascript">("typescript");

  constructor(
    @Inject(DOCUMENT) document: Document,
    public activeModal: NgbActiveModal,
    private readonly promptManager: PromptManager,
    ) {
    super(document);
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
