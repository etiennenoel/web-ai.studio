import {Component} from '@angular/core';
import {
  BaseWritingAssistanceManager,
  InferenceStateEnum, PromptInputStateEnum,
  RewriterManager,
  RewriterRunOptions,
  SummarizerManager,
  SummarizerRunOptions,
  WriterManager,
  WriterRunOptions,
  WritingAssistanceApiEnum
} from '@magieno/angular-ai';

@Component({
  selector: 'webai-studio-writing-assistance',
  standalone: false,
  templateUrl: './writing-assistance.page.html',
  styleUrl: './writing-assistance.page.scss'
})
export class WritingAssistancePage {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  api!: WritingAssistanceApiEnum;

  languageModelAvailability?: "unavailable" | "downloadable" | "downloading" | "available";

  manager!: BaseWritingAssistanceManager;
  protected readonly InferenceStateEnum = InferenceStateEnum;

  constructor(
    private readonly writerManager: WriterManager,
    private readonly summarizerManager: SummarizerManager,
    private readonly rewriterManager: RewriterManager,
  ) {
    this.apiSelected(WritingAssistanceApiEnum.SummarizerApi)
  }

  async apiSelected(api: WritingAssistanceApiEnum, options?: SummarizerRunOptions | WriterRunOptions | RewriterRunOptions) {
    this.api = api;
    switch (api) {
      case WritingAssistanceApiEnum.SummarizerApi:
        this.manager = this.summarizerManager;
        this.languageModelAvailability = await this.summarizerManager.checkAvailability()
        break;
      case WritingAssistanceApiEnum.WriterApi:
        this.manager = this.writerManager;
        this.languageModelAvailability = await this.writerManager.checkAvailability()
        break;
      case WritingAssistanceApiEnum.RewriterApi:
        this.manager = this.rewriterManager;
        this.languageModelAvailability = await this.rewriterManager.checkAvailability()
        break;
    }
  }

  async run(options: SummarizerRunOptions | WriterRunOptions | RewriterRunOptions) {
    switch (this.api) {
      case WritingAssistanceApiEnum.SummarizerApi:
        await this.summarizerManager.createSession(options as SummarizerRunOptions);
        //todo: handle when not supported
        await this.summarizerManager.summarize(options as SummarizerRunOptions);
        break;
      case WritingAssistanceApiEnum.WriterApi:
        //todo: handle when not supported
        await this.writerManager.createSession(options as WriterRunOptions);
        await this.writerManager.write(options as WriterRunOptions);
        break;
      case WritingAssistanceApiEnum.RewriterApi:
        //todo: handle when not supported
        await this.rewriterManager.createSession(options as RewriterRunOptions);
        await this.rewriterManager.rewrite(options as RewriterRunOptions);
        break;
    }
    this.state = PromptInputStateEnum.Ready;
  }

  onCancel() {
    this.manager.cancel();
  }
}
