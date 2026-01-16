import {Component, Input} from '@angular/core';
import {TestStatus} from '../../../../../enums/test-status.enum';

@Component({
  selector: 'axon-test-status-badge',
  standalone: false,
  templateUrl: './axon-test-status-badge.component.html',
  styleUrl: './axon-test-status-badge.component.scss'
})
export class AxonTestStatusBadgeComponent {
  @Input()
  status: TestStatus = TestStatus.Idle;
  protected readonly TestStatus = TestStatus;
}
