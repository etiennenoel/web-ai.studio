import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Modal for sharing Cortex benchmark results via a compressed URL.
 *
 * Why this exists: The share modal UI (loading state, URL display, copy button)
 * was embedded inline in the cortex page template. Extracting it keeps the parent
 * template focused on page layout and makes the modal's state machine clearer.
 */
@Component({
  selector: 'app-cortex-share-modal',
  standalone: false,
  templateUrl: './share-modal.component.html',
})
export class CortexShareModalComponent {

  @Input() isGeneratingUrl = false;
  @Input() generatedShareUrl: string | null = null;
  @Input() isUrlCopied = false;

  @Output() close = new EventEmitter<void>();
  @Output() copyUrl = new EventEmitter<void>();
}
