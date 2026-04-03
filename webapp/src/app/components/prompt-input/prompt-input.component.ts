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
import {Dialog} from '@angular/cdk/dialog';
import {AttachmentModalComponent} from './attachment-modal/attachment-modal.component';
import {CameraModalComponent} from './camera-modal/camera-modal.component';
import {AudioRecordingModalComponent} from './audio-recording-modal/audio-recording-modal.component';

declare const LanguageModel: any;

export type ButtonState = 'Idle' | 'Stop' | 'Interject';

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
  isAttachmentDropdownOpen = false;
  
  options: PromptRunOptions = new PromptRunOptions();

  @Output()
  run = new EventEmitter<PromptRunOptions>(); // Emitting options which include prompt and attachments
  @Output()
  cancel = new EventEmitter<void>();

  @Output()
  optionsChange = new EventEmitter<PromptRunOptions>();

  @Output()
  promptChange = new EventEmitter<string>();

  @Input()
  state: PromptInputStateEnum = PromptInputStateEnum.Ready;

  @Input()
  capabilities = { available: false, audio: false, image: false, text: false };

  @Input()
  initialPrompt: string = '';

  attachmentReadyForPromptMap = new Map<string, boolean>();
  
  protected readonly PromptInputStateEnum = PromptInputStateEnum;
  protected readonly AttachmentTypeEnum = AttachmentTypeEnum;
  protected readonly FramingAlgorithm = FramingAlgorithm;

  constructor(private sanitizer: DomSanitizer,
              @Inject(PLATFORM_ID) private readonly platformId: Object,
              private modalService: Dialog) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialPrompt'] && changes['initialPrompt'].currentValue) {
      if (!this.promptText) {
        this.promptText = changes['initialPrompt'].currentValue;
        this.onOptionsChange();
      }
    }
  }

  get buttonState(): ButtonState {
    if (this.state === PromptInputStateEnum.Inferencing) {
      const hasInput = this.promptText.trim().length > 0 || this.attachments.length > 0;
      return hasInput ? 'Interject' : 'Stop';
    }
    return 'Idle';
  }

  get runBtnTooltip() {
    if (this.attachmentWarnings) {
      return "Be careful, some attachments have warnings. They might not be processed correctly.";
    }

    return "Press ctrl/cmd+enter";
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
    this.promptChange.emit(this.promptText);
  }

  async onRunClick() {
    if (!this.capabilities.available) {
      return;
    }

    const btnState = this.buttonState;

    if (btnState === 'Stop') {
      this.cancel.emit();
      this.promptText = ''; // Clear potentially empty/whitespace prompt if any
      return;
    }

    // Interject or Idle -> Run
    
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
      if (item.kind === 'file') {
        const isImageOrPdf = item.type.startsWith('image/') || item.type.startsWith('application/pdf');
        const isAudio = item.type.startsWith('audio/');
        
        if ((isImageOrPdf && this.capabilities.image) || (isAudio && this.capabilities.audio)) {
          const file = item.getAsFile();
          if (file) {
            this.addAttachment(file);
            event.preventDefault();
          }
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
        const isImageOrPdf = file.type.startsWith('image/') || file.type.startsWith('application/pdf');
        const isAudio = file.type.startsWith('audio/');
        
        if ((isImageOrPdf && this.capabilities.image) || (isAudio && this.capabilities.audio)) {
          this.addAttachment(file);
        }
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
    const modalRef = this.modalService.open(CameraModalComponent, {
      panelClass: ['w-[90vw]', 'max-w-3xl', 'mx-auto', 'bg-transparent', 'shadow-none'],
      hasBackdrop: true,
      backdropClass: 'bg-black/50',
    });

    modalRef.closed.subscribe((result: any) => {
      if (result) {
        this.addAttachment(result);
      }
    });
  }
  
  recordAudio() {
    const modalRef = this.modalService.open(AudioRecordingModalComponent, {
      panelClass: ['w-[90vw]', 'max-w-md', 'mx-auto', 'bg-transparent', 'shadow-none'],
      hasBackdrop: true,
      backdropClass: 'bg-black/50',
      disableClose: true,
    });

    modalRef.closed.subscribe((result: any) => {
      if (result) {
        this.addAttachment(result);
      }
    });
  }
  
  async takeScreenshot() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'screenshot.png', { type: 'image/png' });
              this.addAttachment(file);
            }
            stream.getTracks().forEach(t => t.stop());
          }, 'image/png');
        }
      };
    } catch (e) {
      console.error('Screenshot failed or was cancelled', e);
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
        const isImageOrPdf = file.type.startsWith('image/') || file.type.startsWith('application/pdf');
        const isAudio = file.type.startsWith('audio/');
        
        if ((isImageOrPdf && this.capabilities.image) || (isAudio && this.capabilities.audio)) {
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
    this.modalService.open(AttachmentModalComponent, {
      panelClass: ['w-[90vw]', 'max-w-6xl', 'mx-auto', 'bg-transparent', 'shadow-none'],
      hasBackdrop: true,
      backdropClass: 'bg-black/50',
      data: {
        attachment: attachment,
        isAttachmentReadyForPrompt: this.attachmentReadyForPromptMap.get(attachment.id),
        imageResolution: { width: attachment.width, height: attachment.height }
      }
    });
  }
}