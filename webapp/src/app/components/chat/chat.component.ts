import { Component, Input } from '@angular/core';
import { Message } from '../../core/services/conversation.manager';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AttachmentModalComponent } from '../prompt-input/attachment-modal/attachment-modal.component';
import { Attachment } from '../../core/interfaces/attachment.interface';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: false
})
export class ChatComponent {
  @Input() messages: Message[] = [];
  @Input() status: string | null = null;

  constructor(private modalService: NgbModal) {}

  openAttachment(attachment: Attachment) {
    const modalRef = this.modalService.open(AttachmentModalComponent, { size: 'xl' });
    modalRef.componentInstance.attachment = attachment;
    // Set attachment to be ready so no warning is displayed in chat preview
    modalRef.componentInstance.isAttachmentReadyForPrompt = true;
    modalRef.componentInstance.imageResolution = { width: attachment.width, height: attachment.height };
  }
}
