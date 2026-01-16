import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-available-api-card',
  templateUrl: './available-api-card.component.html',
  standalone: false,
  styleUrl: 'available-api-card.component.scss',
})
export class AvailableApiCardComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() statusLabel: string = '';
  @Input() statusType: 'stable' | 'trial' | 'dev' = 'stable';
  @Input() themeColor: 'purple' | 'blue' | 'pink' | 'emerald' | 'indigo' | 'teal' | 'orange' | string = 'purple';
}
