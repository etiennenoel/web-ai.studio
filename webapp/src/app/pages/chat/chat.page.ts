import {Component, Inject, OnDestroy, OnInit, PLATFORM_ID, DOCUMENT} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {isPlatformServer} from '@angular/common';
import {Title} from '@angular/platform-browser';
import {ConversationManager} from '../../core/services/conversation.manager';
import {PromptRunOptions} from '../../core/models/prompt-run.options';
import {InferenceStateEnum} from '../../core/enums/inference-state.enum';
import {PromptInputStateEnum} from '../../core/enums/prompt-input-state.enum';
import {BasePage} from '../base-page';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {PromptCodeModal} from '../../components/prompt-code-modal/prompt-code-modal';

declare const LanguageModel: any;

@Component({
  selector: 'page-chat',
  templateUrl: './chat.page.html',
  standalone: false,
  styleUrl: './chat.page.scss'
})
export class ChatPage extends BasePage implements OnInit, OnDestroy {
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  languageModelAvailability?: "unavailable" | "downloadable" | "downloading" | "available" | "loading..." = "loading...";

  progress: number = 0;

  options: PromptRunOptions = new PromptRunOptions();

  constructor(
    router: Router,
    route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
    public readonly conversationManager: ConversationManager,

    private readonly ngbModal: NgbModal,
  ) {
    super(document, title)

    this.setTitle("Chat")
  }

  override async ngOnInit() {
    super.ngOnInit();

    await this.checkAvailability()

    if(isPlatformServer(this.platformId)) {
      return;
    }

    this.conversationManager.createAndLoadSession(this.options);
  }

  onOptionsChange(options: PromptRunOptions) {
    if(this.options === options) {
      let isEqual = true;
      // cheeck if all the properties are equal first
      for (const key in options) {
        if (options.hasOwnProperty(key)) {
          if (options[key as keyof PromptRunOptions] !== this.options[key as keyof PromptRunOptions]) {
            isEqual = false;
            break;
          }
        }
      }

      if (isEqual) {
        return;
      }
    }

    this.options = options;
    this.conversationManager.createAndLoadSession(options);
  }

  openCodeModal() {
    const codeModalComponent = this.ngbModal.open(PromptCodeModal, {
      size: "xl",
    });
    (codeModalComponent.componentInstance as PromptCodeModal).options = this.options;
    codeModalComponent.componentInstance.updateCode();
  }

  async onRun(options: PromptRunOptions) {
    await this.conversationManager.run(options.prompt);
    this.state = PromptInputStateEnum.Ready;
  }

  onCancel() {
    this.conversationManager.cancel();
  }

  async triggerDownload() {
    const self = this;

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
