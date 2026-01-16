import { Component, Input } from '@angular/core';
import { ApiCheck } from 'base';

@Component({
  selector: 'app-api-status',
  templateUrl: './api-status.component.html',
  styleUrls: ['./api-status.component.scss'],
  standalone: false
})
export class ApiStatusComponent {
  @Input() apiName: string = '';
  @Input() statusText: string = '';
  @Input() isAvailable: boolean = false;
  @Input() isWarning: boolean = false;
  @Input() checks: ApiCheck[] = [];
  @Input() errorHtml: string = '';

  public isExpanded: boolean = false;

  toggleDetails(): void {
    this.isExpanded = !this.isExpanded;
  }
}
