import {ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, DOCUMENT} from '@angular/core';
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
  capabilities = { available: false, audio: false, image: false, text: false };

  get capabilityTooltip(): string {
    if (!this.capabilities.available) {
      return 'No capabilities available';
    }
    const caps = [];
    if (this.capabilities.text) caps.push('Text');
    if (this.capabilities.image) caps.push('Image');
    if (this.capabilities.audio) caps.push('Audio');
    return `Available capabilities: ${caps.join(', ')}`;
  }

  progress: number = 0;

  defaultTemperature = 1; // Default fallback
  maxTemperature = 2;
  maxTopK = 128;
  defaultTopK = 3;

  options: PromptRunOptions = new PromptRunOptions();

  get settingsActive() {
    return this.options.structuredOutputEnabled === true ||
      Number(this.options.temperature) !== Number(this.defaultTemperature) ||
      Number(this.options.topK) !== Number(this.defaultTopK) ||
      this.options.stream !== true;
  }

  constructor(
    router: Router,
    route: ActivatedRoute,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    title: Title,
    public readonly conversationManager: ConversationManager,
    private readonly cdr: ChangeDetectorRef,
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

    await this.loadSettings();

    this.conversationManager.createAndLoadSession(this.options);
    
    this.conversationManager.status$.subscribe(status => {
      this.state = status === InferenceStateEnum.InProgress 
        ? PromptInputStateEnum.Inferencing 
        : PromptInputStateEnum.Ready;
      this.cdr.detectChanges();
    });
  }

  async loadSettings() {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    try {
      if ('LanguageModel' in window) {
        const params = await LanguageModel.params();
        if (params) {
          this.defaultTemperature = params.defaultTemperature || 1;
          this.maxTemperature = params.maxTemperature || 2;
          this.defaultTopK = params.defaultTopK || 3;
          this.maxTopK = params.maxTopK || 128;
        }
      }
    } catch (e) {
      console.warn("Could not load LanguageModel params", e);
    }

    this.options.temperature = this.defaultTemperature;
    this.options.topK = this.defaultTopK;
    this.options.stream = true;

    this.lastOptionsRunStr = JSON.stringify({
      stream: this.options.stream,
      temperature: this.options.temperature,
      topK: this.options.topK,
      structuredOutputEnabled: this.options.structuredOutputEnabled,
      structuredOutputJsonSchema: this.options.structuredOutputJsonSchema
    });
    this.pendingOptionsStr = this.lastOptionsRunStr;
  }

  resetSettings() {
    this.options.temperature = this.defaultTemperature;
    this.options.topK = this.defaultTopK;
    this.options.stream = true;
    this.options.structuredOutputEnabled = false;
    this.onOptionsChange(this.options);
  }

  private lastOptionsRunStr = '';
  private pendingOptionsStr = '';

  onOptionsChange(options: PromptRunOptions) {
    const currentSettings = JSON.stringify({
      stream: options.stream,
      temperature: options.temperature,
      topK: options.topK,
      structuredOutputEnabled: options.structuredOutputEnabled,
      structuredOutputJsonSchema: options.structuredOutputJsonSchema
    });

    this.pendingOptionsStr = currentSettings;
    this.options = options;
  }

  applyPendingSettings() {
    if (this.lastOptionsRunStr === this.pendingOptionsStr) {
      return;
    }
    
    this.lastOptionsRunStr = this.pendingOptionsStr;
    this.conversationManager.addSystemDelimiter("Run settings changed. Started a new context.");
    this.conversationManager.createAndLoadSession(this.options);
  }

  openCodeModal() {
    const codeModalComponent = this.ngbModal.open(PromptCodeModal, {
      size: "xl",
    });
    (codeModalComponent.componentInstance as PromptCodeModal).options = this.options;
    codeModalComponent.componentInstance.updateCode();
  }

  async onRun(options: PromptRunOptions) {
    await this.conversationManager.run(options);
  }

  onCancel() {
    this.conversationManager.cancel();
  }

  onNewChat() {
    this.conversationManager.resetSession(this.options);
  }

  editStructuredOutput() {
     const schema = prompt("Enter JSON Schema:", this.options.structuredOutputJsonSchema);
     if (schema !== null) {
         this.options.structuredOutputJsonSchema = schema;
         this.onOptionsChange(this.options);
     }
  }

  async triggerDownload() {
    const self = this;

    const session = await LanguageModel.create({
      expectedInputs: this.options.expectedInputs || [{ type: "text", languages: ["en"] }],
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

    const testCapabilities = async (inputs: any[]) => {
      try {
        return await LanguageModel.availability({ expectedInputs: inputs });
      } catch (e) {
        return "unavailable";
      }
    };

    // 1. Multimodal (Text + Audio + Image)
    let availability = await testCapabilities([
      { type: "text", languages: ["en"] },
      { type: "audio", languages: ["en"] },
      { type: "image", languages: ["en"] },
    ]);

    if (availability !== "unavailable") {
      this.languageModelAvailability = availability;
      this.capabilities = { available: true, audio: true, image: true, text: true };
      this.updateOptionsExpectedInputs();
      return;
    }

    // 2. Visual-only (Text + Image)
    availability = await testCapabilities([
      { type: "text", languages: ["en"] },
      { type: "image", languages: ["en"] },
    ]);

    if (availability !== "unavailable") {
      this.languageModelAvailability = availability;
      this.capabilities = { available: true, audio: false, image: true, text: true };
      this.updateOptionsExpectedInputs();
      return;
    }

    // 3. Text-only (Text)
    availability = await testCapabilities([
      { type: "text", languages: ["en"] },
    ]);

    if (availability !== "unavailable") {
      this.languageModelAvailability = availability;
      this.capabilities = { available: true, audio: false, image: false, text: true };
      this.updateOptionsExpectedInputs();
      return;
    }

    // completely unavailable
    this.languageModelAvailability = "unavailable";
    this.capabilities = { available: false, audio: false, image: false, text: false };
    this.updateOptionsExpectedInputs();
  }

  updateOptionsExpectedInputs() {
    const expectedInputs = [{ type: "text", languages: ["en"] }];
    if (this.capabilities.audio) expectedInputs.push({ type: "audio", languages: ["en"] });
    if (this.capabilities.image) expectedInputs.push({ type: "image", languages: ["en"] });
    
    this.options.expectedInputs = expectedInputs;
  }

  protected readonly InferenceStateEnum = InferenceStateEnum;
}
