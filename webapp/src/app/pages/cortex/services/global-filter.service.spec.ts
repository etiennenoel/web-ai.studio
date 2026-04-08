import { GlobalFilterService } from './global-filter.service';

describe('GlobalFilterService', () => {
  let service: GlobalFilterService;

  beforeEach(() => {
    service = new GlobalFilterService();
  });

  describe('setOptions', () => {
    it('should initialize options with All prefix', () => {
      service.setOptions(['HW1', 'HW2'], ['CPU'], ['Gemini'], ['v1'], ['Prompt']);

      expect(service.hardwareOptions).toEqual(['All', 'HW1', 'HW2']);
      expect(service.computeOptions).toEqual(['All', 'CPU']);
      expect(service.engineOptions).toEqual(['All', 'Gemini']);
      expect(service.variantOptions).toEqual(['All', 'v1']);
      expect(service.apiOptions).toEqual(['All', 'Prompt']);
    });

    it('should select all options by default when selections are empty', () => {
      service.setOptions(['HW1', 'HW2'], ['CPU'], ['Gemini'], ['v1'], ['Prompt']);

      expect(service.selectedHardwares).toEqual(['All', 'HW1', 'HW2']);
      expect(service.selectedComputes).toEqual(['All', 'CPU']);
      expect(service.selectedEngines).toEqual(['All', 'Gemini']);
      expect(service.selectedVariants).toEqual(['All', 'v1']);
      expect(service.selectedApis).toEqual(['All', 'Prompt']);
    });

    it('should merge options from multiple callers and keep All state', () => {
      // First caller sets some options
      service.setOptions(['HW1'], ['CPU'], ['Gemini'], ['v1'], ['Prompt']);

      expect(service.hardwareOptions).toEqual(['All', 'HW1']);
      expect(service.selectedHardwares).toEqual(['All', 'HW1']);

      // Second caller adds more options
      service.setOptions(['HW2', 'HW3'], ['GPU'], ['LLM IE'], ['v2'], ['Translator']);

      // Options should be the union
      expect(service.hardwareOptions).toEqual(['All', 'HW1', 'HW2', 'HW3']);
      expect(service.computeOptions).toEqual(['All', 'CPU', 'GPU']);
      expect(service.engineOptions).toEqual(['All', 'Gemini', 'LLM IE']);
      expect(service.variantOptions).toEqual(['All', 'v1', 'v2']);
      expect(service.apiOptions).toEqual(['All', 'Prompt', 'Translator']);

      // Selections should still be "all" since they were all-selected before
      expect(service.selectedHardwares).toEqual(['All', 'HW1', 'HW2', 'HW3']);
      expect(service.selectedComputes).toEqual(['All', 'CPU', 'GPU']);
    });

    it('should preserve partial selections when options are merged', () => {
      service.setOptions(['HW1', 'HW2'], ['CPU'], ['Gemini'], ['v1'], ['Prompt']);

      // User deselects HW2
      service.selectFilter('hardware', 'HW2', false);
      expect(service.selectedHardwares).toEqual(['HW1']);

      // Second caller adds HW3
      service.setOptions(['HW3'], [], [], [], []);

      // HW1 should still be selected, HW2 and HW3 should not (since it wasn't "all")
      expect(service.hardwareOptions).toEqual(['All', 'HW1', 'HW2', 'HW3']);
      expect(service.selectedHardwares).toEqual(['HW1']);
    });

    it('should emit filtersChanged on setOptions', () => {
      const spy = jasmine.createSpy('filtersChanged');
      service.filtersChanged.subscribe(spy);

      service.setOptions(['HW1'], ['CPU'], ['Gemini'], ['v1'], ['Prompt']);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectFilter', () => {
    beforeEach(() => {
      service.setOptions(['HW1', 'HW2', 'HW3'], ['CPU', 'GPU'], ['Gemini'], ['v1'], ['Prompt']);
    });

    it('should select All to select everything', () => {
      service.selectedHardwares = [];
      service.selectFilter('hardware', 'All', true);
      expect(service.selectedHardwares).toEqual(['All', 'HW1', 'HW2', 'HW3']);
    });

    it('should deselect All to deselect everything', () => {
      service.selectFilter('hardware', 'All', false);
      expect(service.selectedHardwares).toEqual([]);
    });

    it('should remove individual item and also remove All', () => {
      service.selectFilter('hardware', 'HW2', false);
      expect(service.selectedHardwares).not.toContain('All');
      expect(service.selectedHardwares).not.toContain('HW2');
      expect(service.selectedHardwares).toContain('HW1');
      expect(service.selectedHardwares).toContain('HW3');
    });

    it('should add All back when all individual items are selected', () => {
      service.selectFilter('hardware', 'HW2', false); // deselect one
      expect(service.selectedHardwares).not.toContain('All');

      service.selectFilter('hardware', 'HW2', true); // reselect it
      expect(service.selectedHardwares).toContain('All');
      expect(service.selectedHardwares.length).toBe(service.hardwareOptions.length);
    });

    it('should emit filtersChanged on selectFilter', () => {
      const spy = jasmine.createSpy('filtersChanged');
      service.filtersChanged.subscribe(spy);

      service.selectFilter('hardware', 'HW1', false);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('isFilterSelected', () => {
    beforeEach(() => {
      service.setOptions(['HW1', 'HW2'], ['CPU'], ['Gemini'], ['v1'], ['Prompt']);
    });

    it('should return true for selected items', () => {
      expect(service.isFilterSelected('hardware', 'All')).toBeTrue();
      expect(service.isFilterSelected('hardware', 'HW1')).toBeTrue();
    });

    it('should return false for deselected items', () => {
      service.selectFilter('hardware', 'HW1', false);
      expect(service.isFilterSelected('hardware', 'HW1')).toBeFalse();
    });

    it('should return false for unknown filter types', () => {
      expect(service.isFilterSelected('unknown', 'HW1')).toBeFalse();
    });
  });

  describe('getFilteredOptions', () => {
    beforeEach(() => {
      service.setOptions(['Apple M4', 'Intel i9'], ['CPU', 'GPU'], ['Gemini'], ['v1'], ['Prompt']);
    });

    it('should return all options when no search term', () => {
      expect(service.getFilteredOptions('hardware')).toEqual(['All', 'Apple M4', 'Intel i9']);
    });

    it('should filter by search term', () => {
      service.dropdownSearch['hardware'] = 'apple';
      expect(service.getFilteredOptions('hardware')).toEqual(['Apple M4']);
    });

    it('should return empty when nothing matches', () => {
      service.dropdownSearch['hardware'] = 'zzz';
      expect(service.getFilteredOptions('hardware')).toEqual([]);
    });
  });

  describe('toggleDropdown', () => {
    it('should open a dropdown', () => {
      service.toggleDropdown('hardware');
      expect(service.activeDropdown).toBe('hardware');
    });

    it('should close the same dropdown when toggled again', () => {
      service.toggleDropdown('hardware');
      service.toggleDropdown('hardware');
      expect(service.activeDropdown).toBeNull();
    });

    it('should switch to a different dropdown', () => {
      service.toggleDropdown('hardware');
      service.toggleDropdown('compute');
      expect(service.activeDropdown).toBe('compute');
    });

    it('should reset search when opening a dropdown', () => {
      service.dropdownSearch['hardware'] = 'test';
      service.toggleDropdown('compute');
      service.toggleDropdown('hardware');
      expect(service.dropdownSearch['hardware']).toBe('');
    });
  });
});
