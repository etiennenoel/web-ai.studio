import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-demo-layout',
  templateUrl: './demo-layout.component.html',
  styleUrls: ['./demo-layout.component.scss'],
  standalone: false
})
export class DemoLayoutComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() category: string = '';
  @Input() onDeviceReason: string = '';
  @Input() codeSnippet: string = '';
  @Input() ttft: number | null = null;
  @Input() totalTime: number | null = null;
  

}