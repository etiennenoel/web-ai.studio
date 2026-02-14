import { Component, Input } from '@angular/core';
import { Message } from '../../core/services/conversation.manager';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: false
})
export class ChatComponent {
  @Input() messages: Message[] = [];
  @Input() status: string | null = null;
}
