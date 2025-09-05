import {Component, Inject, OnDestroy, OnInit, PLATFORM_ID, DOCUMENT} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {isPlatformServer} from '@angular/common';
import {Title} from '@angular/platform-browser';
import {ConversationManager, InferenceStateEnum, PromptInputStateEnum, PromptRunOptions} from '@magieno/angular-ai';
import {BasePage} from '../base-page';


@Component({
  selector: 'page-chat',
  templateUrl: './chat.page.html',
  standalone: false,
  styleUrl: './chat.page.scss'
})
export class ChatPage extends BasePage implements OnInit, OnDestroy {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  languageModelAvailability?: "unavailable" | "downloadable" | "downloading" | "available";

  progress: number = 0;
  constructor(
    router: Router,
    route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
    public readonly conversationManager: ConversationManager,
  ) {
    super(document, title)

    this.setTitle("Chat")
  }

  override async ngOnInit() {
    super.ngOnInit();

    await this.checkAvailability()
  }

  async onRun(options: PromptRunOptions) {
    await this.conversationManager.run(options);
    this.state = PromptInputStateEnum.Ready;
  }

  onCancel() {
    this.conversationManager.cancel();
  }

  async triggerDownload() {
    const self = this;

    // @ts-expect-error
    const session = await LanguageModel.create({
      expectedInputs: [
        { type: "text", languages: ["en"] },
        { type: "audio", languages: ["en"] },
        { type: "image", languages: ["en"] },
      ],
      monitor(m: any) {
        m.addEventListener("downloadprogress", (e: any) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
          self.progress = e.loaded;

          self.checkAvailability();
        });
      },
    })

    await this.checkAvailability();
  }

  async checkAvailability() {
    if(isPlatformServer(this.platformId)) {
      return;
    }

    try {
      // @ts-expect-error
      this.languageModelAvailability = await LanguageModel.availability({
        expectedInputs: [
          { type: "text", languages: ["en"] },
          { type: "audio", languages: ["en"] },
          { type: "image", languages: ["en"] },
        ]
      });
    } catch (e) {
      this.languageModelAvailability = "unavailable";
    }
  }

  protected readonly InferenceStateEnum = InferenceStateEnum;
}
