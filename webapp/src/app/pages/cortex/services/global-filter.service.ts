import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GlobalFilterService {
  hardwareOptions: string[] = ['All'];
  computeOptions: string[] = ['All'];
  engineOptions: string[] = ['All'];
  variantOptions: string[] = ['All'];
  apiOptions: string[] = ['All'];

  selectedHardwares: string[] = [];
  selectedComputes: string[] = [];
  selectedEngines: string[] = [];
  selectedVariants: string[] = [];
  selectedApis: string[] = [];
  
  searchQuery: string = '';

  activeDropdown: string | null = null;
  dropdownSearch: { [key: string]: string } = {};

  filtersChanged = new Subject<void>();

  setOptions(hw: string[], compute: string[], engine: string[], variant: string[], api: string[]) {
    this.hardwareOptions = ['All', ...hw];
    this.computeOptions = ['All', ...compute];
    this.engineOptions = ['All', ...engine];
    this.variantOptions = ['All', ...variant];
    this.apiOptions = ['All', ...api];

    if (this.selectedHardwares.length === 0) this.selectedHardwares = [...this.hardwareOptions];
    if (this.selectedComputes.length === 0) this.selectedComputes = [...this.computeOptions];
    if (this.selectedEngines.length === 0) this.selectedEngines = [...this.engineOptions];
    if (this.selectedVariants.length === 0) this.selectedVariants = [...this.variantOptions];
    if (this.selectedApis.length === 0) this.selectedApis = [...this.apiOptions];
    
    this.filtersChanged.next();
  }

  isFilterSelected(filterType: string, value: string): boolean {
    if (filterType === 'hardware') return this.selectedHardwares.includes(value);
    if (filterType === 'compute') return this.selectedComputes.includes(value);
    if (filterType === 'engine') return this.selectedEngines.includes(value);
    if (filterType === 'variant') return this.selectedVariants.includes(value);
    if (filterType === 'api') return this.selectedApis.includes(value);
    return false;
  }

  selectFilter(filterType: string, value: string, isChecked: boolean) {
    const toggle = (arr: string[], val: string, checked: boolean) => {
      let options: string[] = [];
      if (filterType === 'hardware') options = this.hardwareOptions;
      if (filterType === 'compute') options = this.computeOptions;
      if (filterType === 'engine') options = this.engineOptions;
      if (filterType === 'variant') options = this.variantOptions;
      if (filterType === 'api') options = this.apiOptions;

      if (val === 'All') {
        if (checked) {
          return [...options];
        }
        return [];
      } else {
        if (!checked) {
          return arr.filter(item => item !== val && item !== 'All');
        }
        const newArr = [...arr, val];
        if (newArr.length === options.length - 1 && !newArr.includes('All')) {
          newArr.push('All');
        }
        return newArr;
      }
    };

    if (filterType === 'hardware') this.selectedHardwares = toggle(this.selectedHardwares, value, isChecked);
    if (filterType === 'compute') this.selectedComputes = toggle(this.selectedComputes, value, isChecked);
    if (filterType === 'engine') this.selectedEngines = toggle(this.selectedEngines, value, isChecked);
    if (filterType === 'variant') this.selectedVariants = toggle(this.selectedVariants, value, isChecked);
    if (filterType === 'api') this.selectedApis = toggle(this.selectedApis, value, isChecked);

    this.filtersChanged.next();
  }

  toggleDropdown(dropdown: string, event?: any) {
    if(event) event.stopPropagation();
    if (this.activeDropdown === dropdown) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdown;
      this.dropdownSearch[dropdown] = '';
    }
  }

  onDropdownSearch(dropdown: string, event: any) {
    this.dropdownSearch[dropdown] = event.target.value.toLowerCase();
  }

  getFilteredOptions(filterType: string): string[] {
    let options: string[] = [];
    if (filterType === 'hardware') options = this.hardwareOptions;
    if (filterType === 'compute') options = this.computeOptions;
    if (filterType === 'engine') options = this.engineOptions;
    if (filterType === 'variant') options = this.variantOptions;
    if (filterType === 'api') options = this.apiOptions;

    const term = this.dropdownSearch[filterType];
    if (!term) return options;
    return options.filter(opt => opt.toLowerCase().includes(term));
  }
}
