import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-classifier-status',
  templateUrl: './classifier-status.component.html',
  standalone: false
})
export class ClassifierStatusComponent {
  @Input() classifierStatus = 'loading...';
  @Input() isDownloading = false;
  @Input() downloadProgress = 0;
  @Input() showPromptApi = false;
  @Input() promptApiStatus = 'loading...';
}
