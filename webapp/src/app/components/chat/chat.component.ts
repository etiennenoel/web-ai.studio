import { Component, Input } from '@angular/core';
import { Message } from '../../core/services/conversation.manager';
import { Dialog } from '@angular/cdk/dialog';
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

  constructor(private dialog: Dialog) {}

  openAttachment(attachment: Attachment) {
    this.dialog.open(AttachmentModalComponent, {
      panelClass: ['w-[90vw]', 'max-w-6xl', 'mx-auto', 'bg-transparent', 'shadow-none'],
      hasBackdrop: true,
      backdropClass: 'bg-black/50',
      data: {
        attachment: attachment,
        isAttachmentReadyForPrompt: true,
        imageResolution: { width: attachment.width, height: attachment.height }
      }
    });
  }
}
