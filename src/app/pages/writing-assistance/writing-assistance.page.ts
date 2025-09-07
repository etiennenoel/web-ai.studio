import {Component, Inject, OnInit, PLATFORM_ID, signal, WritableSignal} from '@angular/core';
import {
  BaseWritingAssistanceManager, Conversation,
  InferenceStateEnum, PromptInputStateEnum,
  RewriterManager,
  RewriterRunOptions,
  SummarizerManager,
  SummarizerRunOptions,
  WriterManager,
  WriterRunOptions,
  WritingAssistanceApiEnum
} from '@magieno/angular-ai';
import {isPlatformServer} from '@angular/common';
import {magienoSignal, MagienoWritableSignal} from '@magieno/angular-core';

@Component({
  selector: 'webai-studio-writing-assistance',
  standalone: false,
  templateUrl: './writing-assistance.page.html',
  styleUrl: './writing-assistance.page.scss'
})
export class WritingAssistancePage implements OnInit {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  api!: WritingAssistanceApiEnum;

  languageModelAvailability?: "unavailable" | "downloadable" | "downloading" | "available";

  manager: MagienoWritableSignal<BaseWritingAssistanceManager>;
  protected readonly InferenceStateEnum = InferenceStateEnum;

  constructor(
    protected readonly writerManager: WriterManager,
    protected readonly summarizerManager: SummarizerManager,
    protected readonly rewriterManager: RewriterManager,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {

    this.manager = magienoSignal(this.summarizerManager);
    this.apiSelected(WritingAssistanceApiEnum.SummarizerApi)
  }

  ngOnInit() {
    if (isPlatformServer(this.platformId)) {
      return;
    }

  }

  async apiSelected(api: WritingAssistanceApiEnum, options?: SummarizerRunOptions | WriterRunOptions | RewriterRunOptions) {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.api = api;
    switch (api) {
      case WritingAssistanceApiEnum.SummarizerApi:
        this.manager.set(this.summarizerManager);
        this.languageModelAvailability = await this.summarizerManager.checkAvailability()
        break;
      case WritingAssistanceApiEnum.WriterApi:
        this.manager.set(this.writerManager);
        this.languageModelAvailability = await this.writerManager.checkAvailability()
        break;
      case WritingAssistanceApiEnum.RewriterApi:
        this.manager.set(this.rewriterManager);
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
    this.manager().cancel();
  }
}
