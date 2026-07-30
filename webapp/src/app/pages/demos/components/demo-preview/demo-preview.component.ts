import { Component, Input } from '@angular/core';
import {
  DemoChipsPreview,
  DemoCodePreview,
  DemoDiffPreview,
  DemoIoPreview,
  DemoListPreview,
  DemoPreview,
} from '../../../../core/models/demo-preview.interface';

/**
 * Renders the illustrative preview of a demo on its card.
 *
 * Purely presentational: no lifecycle, no API calls, no browser-only code, so it
 * prerenders with the rest of the /demos page.
 */
@Component({
  selector: 'app-demo-preview',
  templateUrl: './demo-preview.component.html',
  standalone: false,
})
export class DemoPreviewComponent {
  @Input({ required: true }) preview!: DemoPreview;

  /** Category accent, e.g. "text-cyan-600 dark:text-cyan-400". */
  @Input() accent = 'text-slate-600 dark:text-slate-400';

  // Narrowing helpers: @switch on `kind` does not narrow the union inside the template.
  get io(): DemoIoPreview {
    return this.preview as DemoIoPreview;
  }

  get diff(): DemoDiffPreview {
    return this.preview as DemoDiffPreview;
  }

  get list(): DemoListPreview {
    return this.preview as DemoListPreview;
  }

  get chips(): DemoChipsPreview {
    return this.preview as DemoChipsPreview;
  }

  get codeBlock(): DemoCodePreview {
    return this.preview as DemoCodePreview;
  }

  get codeLines(): string[] {
    return this.codeBlock.code.split('\n');
  }
}
