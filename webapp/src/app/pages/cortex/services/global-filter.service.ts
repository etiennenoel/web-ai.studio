import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GlobalFilterService {
  hardwareOptions: string[] = ['All'];
  osOptions: string[] = ['All'];
  ramOptions: string[] = ['All'];
  computeOptions: string[] = ['All'];
  engineOptions: string[] = ['All'];
  variantOptions: string[] = ['All'];
  apiOptions: string[] = ['All'];
  startTypeOptions: string[] = ['All'];
  chromeVersionOptions: string[] = ['All'];

  selectedHardwares: string[] = [];
  selectedOs: string[] = [];
  selectedRam: string[] = [];
  selectedComputes: string[] = [];
  selectedEngines: string[] = [];
  selectedVariants: string[] = [];
  selectedApis: string[] = [];
  selectedStartTypes: string[] = [];
  selectedChromeVersions: string[] = [];

  searchQuery: string = '';

  activeDropdown: string | null = null;
  dropdownSearch: { [key: string]: string } = {};

  filtersChanged = new Subject<void>();

  setOptions(hw: string[], compute: string[], engine: string[], variant: string[], api: string[], os?: string[], ram?: string[], startType?: string[], chromeVersion?: string[]) {
    const mergeOptions = (existing: string[], incoming: string[]): string[] => {
      const set = new Set(existing.filter(o => o !== 'All'));
      incoming.forEach(o => set.add(o));
      return ['All', ...Array.from(set).sort()];
    };

    const syncSelections = (selected: string[], oldOptions: string[], newOptions: string[]): string[] => {
      const wasAllSelected = selected.length === 0 || selected.length >= oldOptions.length;
      if (wasAllSelected) {
        return [...newOptions];
      }
      return selected.filter(s => newOptions.includes(s));
    };

    const oldHw = this.hardwareOptions;
    const oldOs = this.osOptions;
    const oldRam = this.ramOptions;
    const oldCompute = this.computeOptions;
    const oldEngine = this.engineOptions;
    const oldVariant = this.variantOptions;
    const oldApi = this.apiOptions;
    const oldStartType = this.startTypeOptions;
    const oldChromeVersion = this.chromeVersionOptions;

    this.hardwareOptions = mergeOptions(this.hardwareOptions, hw);
    if (os) this.osOptions = mergeOptions(this.osOptions, os);
    if (ram) this.ramOptions = mergeOptions(this.ramOptions, ram);
    this.computeOptions = mergeOptions(this.computeOptions, compute);
    this.engineOptions = mergeOptions(this.engineOptions, engine);
    this.variantOptions = mergeOptions(this.variantOptions, variant);
    this.apiOptions = mergeOptions(this.apiOptions, api);
    if (startType) this.startTypeOptions = mergeOptions(this.startTypeOptions, startType);
    if (chromeVersion) this.chromeVersionOptions = mergeOptions(this.chromeVersionOptions, chromeVersion);

    this.selectedHardwares = syncSelections(this.selectedHardwares, oldHw, this.hardwareOptions);
    this.selectedOs = syncSelections(this.selectedOs, oldOs, this.osOptions);
    this.selectedRam = syncSelections(this.selectedRam, oldRam, this.ramOptions);
    this.selectedComputes = syncSelections(this.selectedComputes, oldCompute, this.computeOptions);
    this.selectedEngines = syncSelections(this.selectedEngines, oldEngine, this.engineOptions);
    this.selectedVariants = syncSelections(this.selectedVariants, oldVariant, this.variantOptions);
    this.selectedApis = syncSelections(this.selectedApis, oldApi, this.apiOptions);
    this.selectedStartTypes = syncSelections(this.selectedStartTypes, oldStartType, this.startTypeOptions);
    this.selectedChromeVersions = syncSelections(this.selectedChromeVersions, oldChromeVersion, this.chromeVersionOptions);

    this.filtersChanged.next();
  }

  private getOptionsForType(filterType: string): string[] {
    switch (filterType) {
      case 'hardware': return this.hardwareOptions;
      case 'os': return this.osOptions;
      case 'ram': return this.ramOptions;
      case 'compute': return this.computeOptions;
      case 'engine': return this.engineOptions;
      case 'variant': return this.variantOptions;
      case 'api': return this.apiOptions;
      case 'startType': return this.startTypeOptions;
      case 'chromeVersion': return this.chromeVersionOptions;
      default: return [];
    }
  }

  private getSelectedForType(filterType: string): string[] {
    switch (filterType) {
      case 'hardware': return this.selectedHardwares;
      case 'os': return this.selectedOs;
      case 'ram': return this.selectedRam;
      case 'compute': return this.selectedComputes;
      case 'engine': return this.selectedEngines;
      case 'variant': return this.selectedVariants;
      case 'api': return this.selectedApis;
      case 'startType': return this.selectedStartTypes;
      case 'chromeVersion': return this.selectedChromeVersions;
      default: return [];
    }
  }

  private setSelectedForType(filterType: string, value: string[]): void {
    switch (filterType) {
      case 'hardware': this.selectedHardwares = value; break;
      case 'os': this.selectedOs = value; break;
      case 'ram': this.selectedRam = value; break;
      case 'compute': this.selectedComputes = value; break;
      case 'engine': this.selectedEngines = value; break;
      case 'variant': this.selectedVariants = value; break;
      case 'api': this.selectedApis = value; break;
      case 'startType': this.selectedStartTypes = value; break;
      case 'chromeVersion': this.selectedChromeVersions = value; break;
    }
  }

  isFilterSelected(filterType: string, value: string): boolean {
    return this.getSelectedForType(filterType).includes(value);
  }

  selectFilter(filterType: string, value: string, isChecked: boolean) {
    const arr = this.getSelectedForType(filterType);
    const options = this.getOptionsForType(filterType);

    if (value === 'All') {
      this.setSelectedForType(filterType, isChecked ? [...options] : []);
    } else {
      if (!isChecked) {
        this.setSelectedForType(filterType, arr.filter(item => item !== value && item !== 'All'));
      } else {
        const newArr = [...arr, value];
        if (newArr.length === options.length - 1 && !newArr.includes('All')) {
          newArr.push('All');
        }
        this.setSelectedForType(filterType, newArr);
      }
    }

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
    const options = this.getOptionsForType(filterType);
    const term = this.dropdownSearch[filterType];
    if (!term) return options;
    return options.filter(opt => opt.toLowerCase().includes(term));
  }
}
