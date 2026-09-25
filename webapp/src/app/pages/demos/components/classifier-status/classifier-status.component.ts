import { Component, Input, inject } from '@angular/core';
import { ClassifierService } from '../../../../core/services/classifier.service';

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

  private readonly classifierService = inject(ClassifierService);

  get isPolyfilled(): boolean {
    return this.classifierService.isPolyfilled();
  }
}
