import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quick-access-card',
  templateUrl: './quick-access-card.component.html',
  styleUrl: 'quick-access-card.component.scss',
  standalone: false
})
export class QuickAccessCardComponent {
  @Input() title: string = '';
  @Input() icon: string = '';
  @Input() themeColor: 'blue' | 'purple' | 'pink' | 'indigo' | string = 'blue';
}
