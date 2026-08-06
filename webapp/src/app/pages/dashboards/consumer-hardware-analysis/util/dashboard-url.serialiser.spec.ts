import {DEFAULT_BAND_EDGES} from '../constants/speed-bands.constant';
import {
  DEFAULT_CONTEXT_TOKENS,
  DEFAULT_REALISED_BANDWIDTH,
  DEFAULT_TOKEN_OVERHEAD_MS,
} from '../constants/throughput-model.constant';
import {ConsumerHardwareTabEnum} from '../enums/consumer-hardware-tab.enum';
import {ConsumerTypeEnum} from '../enums/consumer-type.enum';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {MatrixGroupingEnum} from '../enums/matrix-grouping.enum';
import {ModelClassEnum} from '../enums/model-class.enum';
import {DashboardViewStateInterface} from '../interfaces/dashboard-view-state.interface';
import {DashboardUrlSerialiser} from './dashboard-url.serialiser';

describe('DashboardUrlSerialiser', () => {

  const defaults: DashboardViewStateInterface = {
    tab: ConsumerHardwareTabEnum.Horizon,
    year: 2025,
    showModelledValues: true,
    advancedOpen: false,
    bandLows: [...DEFAULT_BAND_EDGES],
    bandHighs: [...DEFAULT_BAND_EDGES],
    contextTokens: DEFAULT_CONTEXT_TOKENS,
    realisedBandwidth: {
      [HardwareSegmentEnum.DiscreteGpu]: DEFAULT_REALISED_BANDWIDTH[HardwareSegmentEnum.DiscreteGpu] * 100,
      [HardwareSegmentEnum.AppleSoc]: DEFAULT_REALISED_BANDWIDTH[HardwareSegmentEnum.AppleSoc] * 100,
      [HardwareSegmentEnum.CpuIntegrated]: DEFAULT_REALISED_BANDWIDTH[HardwareSegmentEnum.CpuIntegrated] * 100,
      [HardwareSegmentEnum.Edge]: DEFAULT_REALISED_BANDWIDTH[HardwareSegmentEnum.Edge] * 100,
    },
    overheadMsPerToken: {...DEFAULT_TOKEN_OVERHEAD_MS},
    matrixGrouping: MatrixGroupingEnum.Type,
    matrixFilter: 'all',
    matrixSearch: '',
    explorerSearch: '',
    sortColumn: 'bandwidth',
    sortDirection: -1,
    horizonClass: ModelClassEnum.Nano2B,
    horizonYears: 5,
    horizonCategories: [
      ConsumerTypeEnum.MainstreamLaptop,
      ConsumerTypeEnum.ProLaptop,
      ConsumerTypeEnum.MidRangeGraphicsCard,
      ConsumerTypeEnum.FlagshipGraphicsCard,
    ],
  };

  /** Serialise a change, parse it back, and hand over what came out. */
  function roundTrip(change: Partial<DashboardViewStateInterface>): DashboardViewStateInterface {
    const state = {...defaults, ...change};
    return DashboardUrlSerialiser.fromParams(DashboardUrlSerialiser.toParams(state, defaults), defaults);
  }

  it('writes nothing at all for a default view', () => {
    expect(DashboardUrlSerialiser.toParams(defaults, defaults)).toEqual({});
  });

  it('reads a bare URL as the default view', () => {
    expect(DashboardUrlSerialiser.fromParams({}, defaults)).toEqual(defaults);
  });

  it('writes only what the reader changed', () => {
    const params = DashboardUrlSerialiser.toParams({...defaults, horizonClass: ModelClassEnum.Xl}, defaults);

    expect(params).toEqual({size: ModelClassEnum.Xl});
  });

  describe('round trips', () => {

    it('the tab, the year and the two toggles', () => {
      const back = roundTrip({
        tab: ConsumerHardwareTabEnum.Matrix,
        year: 2019,
        showModelledValues: false,
        advancedOpen: true,
      });

      expect(back.tab).toBe(ConsumerHardwareTabEnum.Matrix);
      expect(back.year).toBe(2019);
      expect(back.showModelledValues).toBeFalse();
      expect(back.advancedOpen).toBeTrue();
    });

    it('band edges, including half steps', () => {
      const back = roundTrip({bandLows: [8, 16.5, 30, 44], bandHighs: [8, 16.5, 30, 44]});

      expect(back.bandLows).toEqual([8, 16.5, 30, 44]);
      expect(back.bandHighs).toEqual([8, 16.5, 30, 44]);
    });

    it('a scale the reader deliberately left in conflict', () => {
      // conversational's ceiling dragged below its own floor: the shared view has to show
      // the same conflict, not a tidied-up version of it
      const back = roundTrip({bandLows: [10, 20, 35, 50], bandHighs: [10, 20, 35, 24.5]});

      expect(back.bandLows).toEqual([10, 20, 35, 50]);
      expect(back.bandHighs).toEqual([10, 20, 35, 24.5]);
    });

    it('the context window and both tunable losses', () => {
      const back = roundTrip({
        contextTokens: 16384,
        realisedBandwidth: {
          [HardwareSegmentEnum.DiscreteGpu]: 95,
          [HardwareSegmentEnum.AppleSoc]: 80,
          [HardwareSegmentEnum.CpuIntegrated]: 40,
          [HardwareSegmentEnum.Edge]: 30,
        },
        overheadMsPerToken: {
          [HardwareSegmentEnum.DiscreteGpu]: 1,
          [HardwareSegmentEnum.AppleSoc]: 12,
          [HardwareSegmentEnum.CpuIntegrated]: 60,
          [HardwareSegmentEnum.Edge]: 120,
        },
      });

      expect(back.contextTokens).toBe(16384);
      expect(back.realisedBandwidth[HardwareSegmentEnum.CpuIntegrated]).toBe(40);
      expect(back.overheadMsPerToken[HardwareSegmentEnum.Edge]).toBe(120);
    });

    it('the matrix controls and the table sort', () => {
      const back = roundTrip({
        matrixGrouping: MatrixGroupingEnum.Family,
        matrixFilter: HardwareSegmentEnum.AppleSoc,
        matrixSearch: 'RTX',
        explorerSearch: 'LPDDR5',
        sortColumn: 'class:light',
        sortDirection: 1,
      });

      expect(back.matrixGrouping).toBe(MatrixGroupingEnum.Family);
      expect(back.matrixFilter).toBe(HardwareSegmentEnum.AppleSoc);
      expect(back.matrixSearch).toBe('RTX');
      expect(back.explorerSearch).toBe('LPDDR5');
      expect(back.sortColumn).toBe('class:light');
      expect(back.sortDirection).toBe(1);
    });

    it('the horizon selection, whatever order the categories were listed in', () => {
      const back = roundTrip({
        horizonClass: ModelClassEnum.Tiny,
        horizonYears: 3,
        horizonCategories: [ConsumerTypeEnum.BoardOrPhone, ConsumerTypeEnum.FlagshipGraphicsCard],
      });

      expect(back.horizonClass).toBe(ModelClassEnum.Tiny);
      expect(back.horizonYears).toBe(3);
      expect(back.horizonCategories).toEqual([
        ConsumerTypeEnum.FlagshipGraphicsCard,
        ConsumerTypeEnum.BoardOrPhone,
      ]);
    });

    it('an empty category selection, which is a choice and not an absence', () => {
      const params = DashboardUrlSerialiser.toParams({...defaults, horizonCategories: []}, defaults);
      expect(params['cats']).toBe('none');

      expect(DashboardUrlSerialiser.fromParams(params, defaults).horizonCategories).toEqual([]);
    });
  });

  describe('when the URL cannot be trusted', () => {

    it('falls back to the default for an unknown enum value', () => {
      const state = DashboardUrlSerialiser.fromParams(
        {view: 'wharever', size: 'gpt5', group: 'nonsense', only: 'evil'}, defaults);

      expect(state.tab).toBe(defaults.tab);
      expect(state.horizonClass).toBe(defaults.horizonClass);
      expect(state.matrixGrouping).toBe(defaults.matrixGrouping);
      expect(state.matrixFilter).toBe(defaults.matrixFilter);
    });

    it('rejects a number list of the wrong length or out of range', () => {
      expect(DashboardUrlSerialiser.fromParams({bands: '10,20'}, defaults).bandLows).toEqual(defaults.bandLows);
      expect(DashboardUrlSerialiser.fromParams({bands: '10,20,35,9999'}, defaults).bandLows).toEqual(defaults.bandLows);
      expect(DashboardUrlSerialiser.fromParams({realised: '95,80,40,5'}, defaults).realisedBandwidth)
        .toEqual(defaults.realisedBandwidth);
      expect(DashboardUrlSerialiser.fromParams({overhead: 'a,b,c,d'}, defaults).overheadMsPerToken)
        .toEqual(defaults.overheadMsPerToken);
    });

    it('rejects a context length that is not one of the steps', () => {
      expect(DashboardUrlSerialiser.fromParams({ctx: '3000'}, defaults).contextTokens).toBe(defaults.contextTokens);
      expect(DashboardUrlSerialiser.fromParams({ctx: '8192'}, defaults).contextTokens).toBe(8192);
    });

    it('rejects a sort on a column that does not exist', () => {
      const state = DashboardUrlSerialiser.fromParams({sort: '-drop table'}, defaults);

      expect(state.sortColumn).toBe(defaults.sortColumn);
      expect(state.sortDirection).toBe(defaults.sortDirection);
    });

    it('caps a search string rather than carrying a payload', () => {
      const long = 'x'.repeat(500);
      expect(DashboardUrlSerialiser.fromParams({q: long}, defaults).matrixSearch.length).toBe(80);
    });

    it('ignores an implausible year', () => {
      expect(DashboardUrlSerialiser.fromParams({year: '1'}, defaults).year).toBe(defaults.year);
      expect(DashboardUrlSerialiser.fromParams({year: '2019'}, defaults).year).toBe(2019);
    });
  });
});
