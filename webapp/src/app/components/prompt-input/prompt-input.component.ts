import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {isPlatformBrowser, isPlatformServer} from '@angular/common';
import {PromptRunOptions} from '../../core/models/prompt-run.options';
import {PromptInputStateEnum} from '../../core/enums/prompt-input-state.enum';
import {AttachmentTypeEnum} from '../../core/enums/attachment-type.enum';
import {Attachment} from '../../core/interfaces/attachment.interface';
import {FramingAlgorithm} from '../../core/enums/framing-algorithm.enum';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {AttachmentModalComponent} from './attachment-modal/attachment-modal.component';

declare const LanguageModel: any;

@Component({
  selector: 'app-prompt-input',
  templateUrl: './prompt-input.component.html',
  styleUrls: ['./prompt-input.component.scss'],
  standalone: false,
})
export class PromptInputComponent implements OnInit {
  promptText = '';
  attachments: Attachment[] = [];
  isDragging = false;
  attachmentWarnings = false;
  
  options: PromptRunOptions = new PromptRunOptions();

  @Output()
  run = new EventEmitter<PromptRunOptions>(); // Emitting options which include prompt and attachments
  @Output()
  cancel = new EventEmitter<void>();

  @Output()
  optionsChange = new EventEmitter<PromptRunOptions>();

  @Input()
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  defaultTemperature = 0.7; // Default based on model
  maxTemperature = 2;
  maxTopK = 128;
  defaultTopK = 40;
  
  attachmentReadyForPromptMap = new Map<string, boolean>();
  
  protected readonly PromptInputStateEnum = PromptInputStateEnum;
  protected readonly AttachmentTypeEnum = AttachmentTypeEnum;
  protected readonly FramingAlgorithm = FramingAlgorithm;

  constructor(private sanitizer: DomSanitizer,
              @Inject(PLATFORM_ID) private readonly platformId: Object,
              private modalService: NgbModal) {
  }

  get runBtnTooltip() {
    if (this.attachmentWarnings) {
      return "Be careful, some attachments have warnings. They might not be processed correctly.";
    }

    return "Press ctrl/cmd+enter";
  }

  get settingsActive() {
    return this.options.structuredOutputEnabled === true ||
      this.options.temperature !== this.defaultTemperature ||
      this.options.topK !== this.defaultTopK;
  }

  async ngOnInit() {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    try {
      if ('LanguageModel' in self) {
        // const params = await LanguageModel.params();
        // if (params) {
        //   this.maxTemperature = params.maxTemperature || 2;
        //   this.maxTopK = params.maxTopK || 128;
        //   this.defaultTemperature = params.defaultTemperature || 0.7;
        //   this.defaultTopK = params.defaultTopK || 40;
        // }
      }
    } catch (e) {
      console.warn("Could not load LanguageModel params", e);
    }
    
    this.onOptionsChange();
  }

  async getOptions(): Promise<PromptRunOptions> {
    // Clone options to avoid mutating the form state directly during run if needed
    const runOptions = new PromptRunOptions();
    Object.assign(runOptions, this.options);
    runOptions.attachments = this.attachments; // Pass attachments
    
    return runOptions;
  }

  async onOptionsChange() {
    this.optionsChange.emit(this.options);
  }

  async onRunClick() {
    if (this.state === PromptInputStateEnum.Inferencing) return;
    
    // Hack: Add prompt to options for transport if not present
    const options: any = await this.getOptions();
    options.prompt = this.promptText; 
    
    this.run.emit(options);

    this.promptText = '';
    this.attachments = [];
    this.attachmentWarnings = false;
    this.attachmentReadyForPromptMap.clear();
    
    this.onOptionsChange();
  }

  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('audio/') || item.type.startsWith('application/pdf'))) {
        const file = item.getAsFile();
        if (file) {
          this.addAttachment(file);
          event.preventDefault();
        }
      }
    }
    this.onOptionsChange();
  }

  onStopClick() {
    this.cancel.emit()
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (const file of Array.from(input.files)) {
        this.addAttachment(file);
      }
    }
    this.onOptionsChange();
    input.value = '';
  }

  openFileUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.onchange = (event) => this.onFileSelected(event);
    fileInput.click();
  }

  openCamera() {
     alert("Camera not implemented in this demo.");
  }
  
  recordAudio() {
      alert("Audio recording not implemented in this demo.");
  }
  
  takeScreenshot() {
      alert("Screenshot not implemented in this demo.");
  }

  editStructuredOutput() {
     const schema = prompt("Enter JSON Schema:", this.options.structuredOutputJsonSchema);
     if (schema !== null) {
         this.options.structuredOutputJsonSchema = schema;
     }
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('application/pdf')) {
          this.addAttachment(file);
        }
      }
    } else if (event.dataTransfer?.types.includes("text/plain")) {
      const items = event.dataTransfer?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'string') {
            item.getAsString(text => {
              this.promptText = text;
            })
            return;
          }
        }
      }
    }
    this.onOptionsChange();
  }

  private async addAttachment(file: File) {
    let type = AttachmentTypeEnum.Image;
    if (file.type.startsWith('audio')) type = AttachmentTypeEnum.Audio;
    if (file.type.startsWith('application/pdf')) type = AttachmentTypeEnum.Pdf;

    const attachment: Attachment = {
      id: crypto.randomUUID(),
      file,
      content: file,
      safeUrl: this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)),
      mimeType: file.type,
      type: type,
      framingAlgorithm: FramingAlgorithm.NoFraming,
    };

    if (type === AttachmentTypeEnum.Image) {
        // Mock dimensions
        attachment.width = 100;
        attachment.height = 100;
    }

    this.attachments.push(attachment);
    this.attachmentReadyForPromptMap.set(attachment.id, true); // Mock validator
    this.onOptionsChange();
  }

  openAttachmentModal(attachment: Attachment) {
    const modalRef = this.modalService.open(AttachmentModalComponent, { size: 'xl' });
    modalRef.componentInstance.attachment = attachment;
    modalRef.componentInstance.isAttachmentReadyForPrompt = this.attachmentReadyForPromptMap.get(attachment.id);
    modalRef.componentInstance.imageResolution = { width: attachment.width, height: attachment.height };
  }
}