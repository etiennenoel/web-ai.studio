import {Component, Inject, OnInit, PLATFORM_ID, signal, WritableSignal} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {WritingAssistanceService} from '../../core/services/writing-assistance.service';
import {WritingAssistanceApiEnum} from '../../core/enums/writing-assistance-api.enum';
import {PromptInputStateEnum} from '../../core/enums/prompt-input-state.enum';

@Component({
  selector: 'webai-studio-writing-assistance',
  standalone: false,
  templateUrl: './writing-assistance.page.html',
  styleUrl: './writing-assistance.page.scss'
})
export class WritingAssistancePage implements OnInit {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;
  api: WritingAssistanceApiEnum = WritingAssistanceApiEnum.SummarizerApi;
  languageModelAvailability?: string;
  output = signal<string>('');

  constructor(
    private readonly writingAssistanceService: WritingAssistanceService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.checkAvailability(this.api);
  }

  ngOnInit() {
  }

  async checkAvailability(api: WritingAssistanceApiEnum) {
    if (isPlatformServer(this.platformId)) return;
    this.languageModelAvailability = await this.writingAssistanceService.checkAvailability(api);
  }

  async apiSelected(api: WritingAssistanceApiEnum) {
    this.api = api;
    await this.checkAvailability(api);
  }

  async run(input: string) {
    this.state = PromptInputStateEnum.Disabled;
    try {
      const result = await this.writingAssistanceService.run(this.api, input);
      this.output.set(result);
    } catch (e) {
      console.error(e);
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
