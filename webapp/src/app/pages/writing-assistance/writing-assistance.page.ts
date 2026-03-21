import {Component, Inject, OnInit, PLATFORM_ID, signal, ViewChild} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {WritingAssistanceService} from '../../core/services/writing-assistance.service';
import {WritingAssistanceApiEnum} from '../../core/enums/writing-assistance-api.enum';
import {PromptInputStateEnum} from '../../core/enums/prompt-input-state.enum';
import {WritingAssistanceOptions} from '../../core/models/writing-assistance-options.model';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {WritingAssistanceCodeModal} from '../../components/writing-assistance-code-modal/writing-assistance-code-modal';
import {WritingAssistanceInputComponent} from '../../components/writing-assistance-input/writing-assistance-input.component';

@Component({
  selector: 'webai-studio-writing-assistance',
  standalone: false,
  templateUrl: './writing-assistance.page.html',
  styleUrl: './writing-assistance.page.scss',
  host: {
    class: 'block h-full w-full flex flex-col min-h-0'
  }
})
export class WritingAssistancePage implements OnInit {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  api: WritingAssistanceApiEnum = WritingAssistanceApiEnum.SummarizerApi;
  languageModelAvailability?: string;
  output = signal<string>('');

  @ViewChild('inputComponent') inputComponent!: WritingAssistanceInputComponent;

  constructor(
    private readonly writingAssistanceService: WritingAssistanceService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private readonly ngbModal: NgbModal,
  ) {
    this.checkAvailability(this.api);
  }

  ngOnInit() {
  }

  openCodeModal() {
    const codeModalComponent = this.ngbModal.open(WritingAssistanceCodeModal, {
      size: "xl",
    });
    const instance = codeModalComponent.componentInstance as WritingAssistanceCodeModal;
    instance.api = this.api;
    if (this.inputComponent) {
      instance.options = this.inputComponent.options;
    }
    instance.updateCode();
  }

  async checkAvailability(api: WritingAssistanceApiEnum) {
    if (isPlatformServer(this.platformId)) return;
    this.languageModelAvailability = await this.writingAssistanceService.checkAvailability(api);
  }

  async apiSelected(api: WritingAssistanceApiEnum) {
    this.api = api;
    await this.checkAvailability(api);
  }

  async run(event: { input: string, options: WritingAssistanceOptions }) {
    this.state = PromptInputStateEnum.Disabled;
    this.output.set('');
    try {
      await this.writingAssistanceService.runStreaming(this.api, event.input, event.options, (chunk, full) => {
        this.output.set(full);
      });
    } catch (e) {
      console.error(e);
      this.output.set('Error: ' + e);
    } finally {
      this.state = PromptInputStateEnum.Ready;
    }
  }

  onCancel() {
    this.writingAssistanceService.cancel();
    this.state = PromptInputStateEnum.Ready;
  }

  protected readonly WritingAssistanceApiEnum = WritingAssistanceApiEnum;
}
