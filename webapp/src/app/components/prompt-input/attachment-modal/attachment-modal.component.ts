import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {Attachment} from '../../../core/interfaces/attachment.interface';
import {AttachmentTypeEnum} from '../../../core/enums/attachment-type.enum';
import {FramingAlgorithm} from '../../../core/enums/framing-algorithm.enum';
import {OutputType} from '../../../core/enums/output-type.enum';
import {ImageProcessingService} from '../../../core/services/image-processing.service';
import {PdfProcessingService} from '../../../core/services/pdf-processing.service';
import {EventStore} from '../../../core/stores/event.store';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';

@Component({
  selector: 'app-attachment-modal',
  templateUrl: './attachment-modal.component.html',
  styleUrls: ['./attachment-modal.component.scss'],
  standalone: false,
})
export class AttachmentModalComponent implements OnChanges {

  @Input() attachment!: Attachment;

  @Input() isAttachmentReadyForPrompt: boolean = true;

  @Input() imageResolution?: { height: number, width: number }

  imageSafeUrls: SafeUrl[] = [];
  protected readonly AttachmentTypeEnum = AttachmentTypeEnum;
  protected readonly FramingAlgorithm = FramingAlgorithm;

  constructor(
    public activeModal: NgbActiveModal,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly pdfProcessingService: PdfProcessingService,
    private sanitizer: DomSanitizer,
    private readonly eventStore: EventStore,
  ) {
  }

  async setImageSafeUrl() {
    if (!this.attachment.file) {
      return;
    }

    if (this.attachment.type === AttachmentTypeEnum.Image) {
      switch (this.attachment.framingAlgorithm) {
        case FramingAlgorithm.NoFraming:
          this.imageSafeUrls = [this.attachment.safeUrl];
          return;
        case FramingAlgorithm.Tiling:
        case FramingAlgorithm.Padding:
          // In stub, frame returns strings for DataUrl output type
          const frames = await this.imageProcessingService.frame(this.attachment.content, {
            width: 768,
            height: 768
          }, this.attachment.framingAlgorithm!, OutputType.DataUrl);
          this.imageSafeUrls = frames.map((f: string) => this.sanitizer.bypassSecurityTrustUrl(f));
          return; // Added return to match logic
      }
      // Default fallback if not handled above (e.g. Contain, or initial load logic)
      this.imageSafeUrls = [this.attachment.safeUrl]; 
    }

    if (this.attachment.type === AttachmentTypeEnum.Pdf) {
      const pdfPagesAsImages = await this.pdfProcessingService.getPagesAsImageBlobs(this.attachment.content);

      this.imageSafeUrls = [];

      for (const page of pdfPagesAsImages) {
        // const dimensions = await this.imageProcessingService.getImageDimensions(page);

        switch (this.attachment.framingAlgorithm) {
          case FramingAlgorithm.NoFraming:
            this.imageSafeUrls.push(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(page)));
            break;
          case FramingAlgorithm.Tiling:
          case FramingAlgorithm.Padding:
             const frames = await this.imageProcessingService.frame(page, {
              width: 768,
              height: 768
            }, this.attachment.framingAlgorithm!, OutputType.DataUrl);
            this.imageSafeUrls.push(...frames.map((f: string) => this.sanitizer.bypassSecurityTrustUrl(f)));
            break;
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attachment']) {
      this.setImageSafeUrl();
    }
  }

  async onAlgorithmChange(algorithm: FramingAlgorithm) {
    if (this.attachment.type === AttachmentTypeEnum.Image || this.attachment.type === AttachmentTypeEnum.Pdf) {
      this.attachment.framingAlgorithm = algorithm;
      this.eventStore.updateFramingAlgorithm.next();

      await this.setImageSafeUrl();

    }
  }
}
