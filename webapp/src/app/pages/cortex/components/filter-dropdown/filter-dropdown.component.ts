import { Component, Input } from '@angular/core';
import { GlobalFilterService } from '../../services/global-filter.service';
import { CortexUiHelpers } from '../../util/cortex-ui.helpers';

/**
 * Reusable filter dropdown for the Cortex benchmark toolbar.
 *
 * Why this exists: The cortex page had 4 nearly identical filter dropdowns
 * (Hardware, Compute, Engine, Variant) — each ~25 lines of template with the
 * same button/panel/search/checkbox structure, differing only in the filter type
 * label and which service arrays they read from. Extracting to a component
 * eliminates the repetition and makes adding new filter types trivial.
 */
@Component({
  selector: 'app-cortex-filter-dropdown',
  standalone: false,
  templateUrl: './filter-dropdown.component.html',
})
export class CortexFilterDropdownComponent {

  /** Which filter category this dropdown controls (maps to GlobalFilterService internals) */
  @Input() filterType!: string;

  /** Short label shown on the button (e.g. 'HW:', 'Compute:') */
  @Input() label!: string;

  /**
   * Tailwind width class for the dropdown panel.
   * Hardware needs a wider panel (w-56) than the others (w-48).
   */
  @Input() dropdownWidth: string = 'w-48';

  constructor(public filterService: GlobalFilterService) {}

  /** Optional transform for display labels (e.g. 'cold' -> 'Cold Start') */
  @Input() labelTransform?: (value: string) => string;

  /** Returns the selected array for this filter type */
  get selected(): string[] {
    switch (this.filterType) {
      case 'hardware': return this.filterService.selectedHardwares;
      case 'os': return this.filterService.selectedOs;
      case 'ram': return this.filterService.selectedRam;
      case 'compute': return this.filterService.selectedComputes;
      case 'engine': return this.filterService.selectedEngines;
      case 'variant': return this.filterService.selectedVariants;
      case 'startType': return this.filterService.selectedStartTypes;
      case 'chromeVersion': return this.filterService.selectedChromeVersions;
      default: return [];
    }
  }

  /** Returns the options array for this filter type */
  get options(): string[] {
    switch (this.filterType) {
      case 'hardware': return this.filterService.hardwareOptions;
      case 'os': return this.filterService.osOptions;
      case 'ram': return this.filterService.ramOptions;
      case 'compute': return this.filterService.computeOptions;
      case 'engine': return this.filterService.engineOptions;
      case 'variant': return this.filterService.variantOptions;
      case 'startType': return this.filterService.startTypeOptions;
      case 'chromeVersion': return this.filterService.chromeVersionOptions;
      default: return [];
    }
  }

  /** Returns display label for a given option */
  getDisplayLabel(opt: string): string {
    if (this.labelTransform) return this.labelTransform(opt);
    return opt;
  }

  /** Whether this filter has a non-default selection (for active styling) */
  get isFiltered(): boolean {
    return this.selected.length > 0 && this.selected.length < this.options.length;
  }

  /** Returns a color class for a filter option based on filter type */
  getOptionColorClass(value: string): string {
    return CortexUiHelpers.getFilterBadgeClass(this.filterType, value);
  }

  /** Returns an icon class for compute type options */
  getComputeIcon(value: string): string {
    return CortexUiHelpers.getFilterIcon('compute', value);
  }

  /** Human-readable summary of the current selection */
  get selectionLabel(): string {
    if (this.selected.length === this.options.length) return 'All';
    if (this.selected.length === 0) return 'None';
    if (this.selected.length === 1) return this.selected[0];
    return this.selected.length + ' Sel';
  }
}
