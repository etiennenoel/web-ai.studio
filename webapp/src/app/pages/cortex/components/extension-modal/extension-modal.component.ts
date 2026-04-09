import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Modal prompting the user to install the WebAI Extension before running benchmarks.
 *
 * Why this exists: The extension-required modal had its own state transitions
 * (install link, reload, skip, "don't ask again") embedded inline in the cortex
 * template. Extracting it cleans up the parent and makes this dialog reusable
 * if other pages also need to prompt for extension installation.
 */
@Component({
  selector: 'app-cortex-extension-modal',
  standalone: false,
  templateUrl: './extension-modal.component.html',
})
export class CortexExtensionModalComponent {

  @Input() skipExtensionCheck = false;

  @Output() close = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
  @Output() runWithout = new EventEmitter<void>();
  @Output() toggleSkip = new EventEmitter<void>();
}
