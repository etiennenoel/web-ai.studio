import { Component, Input } from '@angular/core';

/**
 * Availability header shared by the Semantic Embedder demos: status pills for the
 * embedder (and optionally the Prompt API), plus the Canary flag hint when unavailable.
 */
@Component({
  selector: 'app-embedder-status',
  templateUrl: './embedder-status.component.html',
  standalone: false
})
export class EmbedderStatusComponent {
  @Input() embedderStatus: string = 'loading...';
  @Input() showPromptApi = false;
  @Input() promptApiStatus: string = 'loading...';
  @Input() isDownloading = false;
  @Input() downloadProgress = 0;
}
