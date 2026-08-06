import {URL_PARAMS} from '../constants/url-params.constant';
import {CONSUMER_TYPE_ORDER} from '../constants/consumer-types.constant';
import {HARDWARE_SEGMENT_ORDER} from '../constants/hardware-segments.constant';
import {MODEL_CLASSES} from '../constants/model-classes.constant';
import {
  CONTEXT_STEPS,
  REALISED_BANDWIDTH_RANGE,
  TOKEN_OVERHEAD_RANGE,
} from '../constants/throughput-model.constant';
import {ConsumerHardwareTabEnum} from '../enums/consumer-hardware-tab.enum';
import {ConsumerTypeEnum} from '../enums/consumer-type.enum';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {MatrixGroupingEnum} from '../enums/matrix-grouping.enum';
import {ModelClassEnum} from '../enums/model-class.enum';
import {DashboardViewStateInterface} from '../interfaces/dashboard-view-state.interface';

/** Highest speed a band edge may be set to, matching the sliders. */
const MAX_BAND_EDGE = 1000;

/**
 * Turns the view into query parameters and back.
 *
 * Two rules shape the whole thing:
 *
 *  - **Only differences travel.** A parameter appears only when its value differs from
 *    the default, so a default view has a clean URL and a shared one carries exactly
 *    what the sender changed.
 *  - **The URL is untrusted input.** Every value is checked against the enum, list
 *    length or numeric range it belongs to; anything unparseable is dropped in favour of
 *    the default rather than allowed to produce a broken view.
 */
export class DashboardUrlSerialiser {

  /** The parameters that describe `state`, given the defaults it is measured against. */
  static toParams(state: DashboardViewStateInterface,
                  defaults: DashboardViewStateInterface): Record<string, string> {
    const params: Record<string, string> = {};
    const put = (name: string, value: string) => params[name] = value;

    if (state.tab !== defaults.tab) {
      put(URL_PARAMS.tab, state.tab);
    }
    if (state.year !== defaults.year) {
      put(URL_PARAMS.year, String(state.year));
    }
    if (state.showModelledValues !== defaults.showModelledValues) {
      put(URL_PARAMS.modelled, state.showModelledValues ? '1' : '0');
    }
    if (state.advancedOpen !== defaults.advancedOpen) {
      put(URL_PARAMS.advanced, state.advancedOpen ? '1' : '0');
    }

    if (!this.sameNumbers(state.bandLows, defaults.bandLows)) {
      put(URL_PARAMS.bandLows, this.joinNumbers(state.bandLows));
    }
    // The ceilings only need saying when the reader has left them disagreeing with the
    // floors they sit against — otherwise they are implied.
    if (!this.sameNumbers(state.bandHighs, state.bandLows)) {
      put(URL_PARAMS.bandHighs, this.joinNumbers(state.bandHighs));
    }

    if (state.contextTokens !== defaults.contextTokens) {
      put(URL_PARAMS.context, String(state.contextTokens));
    }
    const realised = this.segmentValues(state.realisedBandwidth);
    if (!this.sameNumbers(realised, this.segmentValues(defaults.realisedBandwidth))) {
      put(URL_PARAMS.realised, this.joinNumbers(realised));
    }
    const overhead = this.segmentValues(state.overheadMsPerToken);
    if (!this.sameNumbers(overhead, this.segmentValues(defaults.overheadMsPerToken))) {
      put(URL_PARAMS.overhead, this.joinNumbers(overhead));
    }

    if (state.matrixGrouping !== defaults.matrixGrouping) {
      put(URL_PARAMS.grouping, state.matrixGrouping);
    }
    if (state.matrixFilter !== defaults.matrixFilter) {
      put(URL_PARAMS.matrixFilter, state.matrixFilter);
    }
    if (state.matrixSearch.trim() !== defaults.matrixSearch.trim()) {
      put(URL_PARAMS.matrixSearch, state.matrixSearch.trim());
    }
    if (state.explorerSearch.trim() !== defaults.explorerSearch.trim()) {
      put(URL_PARAMS.explorerSearch, state.explorerSearch.trim());
    }
    if (state.sortColumn !== defaults.sortColumn || state.sortDirection !== defaults.sortDirection) {
      put(URL_PARAMS.sort, `${state.sortDirection === -1 ? '-' : ''}${state.sortColumn}`);
    }

    if (state.horizonClass !== defaults.horizonClass) {
      put(URL_PARAMS.horizonClass, state.horizonClass);
    }
    if (state.horizonYears !== defaults.horizonYears) {
      put(URL_PARAMS.horizonYears, String(state.horizonYears));
    }
    if (!this.sameCategories(state.horizonCategories, defaults.horizonCategories)) {
      // an explicit marker, because "no categories" is a real choice and an empty string
      // would be indistinguishable from an absent parameter
      put(URL_PARAMS.horizonCategories, state.horizonCategories.length ? state.horizonCategories.join(',') : 'none');
    }

    return params;
  }

  /**
   * The state a URL describes: the defaults, overridden by whatever the parameters say
   * and can be trusted to mean.
   */
  static fromParams(params: Record<string, string | null | undefined>,
                    defaults: DashboardViewStateInterface): DashboardViewStateInterface {
    const state: DashboardViewStateInterface = {
      ...defaults,
      bandLows: [...defaults.bandLows],
      bandHighs: [...defaults.bandHighs],
      realisedBandwidth: {...defaults.realisedBandwidth},
      overheadMsPerToken: {...defaults.overheadMsPerToken},
      horizonCategories: [...defaults.horizonCategories],
    };

    const tab = this.oneOf(params[URL_PARAMS.tab], Object.values(ConsumerHardwareTabEnum));
    if (tab) {
      state.tab = tab;
    }

    const year = this.integer(params[URL_PARAMS.year], 1970, 2200);
    if (year !== null) {
      state.year = year;
    }

    const modelled = this.boolean(params[URL_PARAMS.modelled]);
    if (modelled !== null) {
      state.showModelledValues = modelled;
    }
    const advanced = this.boolean(params[URL_PARAMS.advanced]);
    if (advanced !== null) {
      state.advancedOpen = advanced;
    }

    const lows = this.numberList(params[URL_PARAMS.bandLows], defaults.bandLows.length, 0, MAX_BAND_EDGE);
    if (lows) {
      state.bandLows = lows;
      // an aligned scale by default: the ceilings follow the floors unless told otherwise
      state.bandHighs = [...lows];
    }
    const highs = this.numberList(params[URL_PARAMS.bandHighs], defaults.bandHighs.length, 0, MAX_BAND_EDGE);
    if (highs) {
      state.bandHighs = highs;
    }

    const context = this.integer(params[URL_PARAMS.context], 0, CONTEXT_STEPS[CONTEXT_STEPS.length - 1]);
    if (context !== null && CONTEXT_STEPS.includes(context)) {
      state.contextTokens = context;
    }

    const realised = this.numberList(
      params[URL_PARAMS.realised], HARDWARE_SEGMENT_ORDER.length,
      REALISED_BANDWIDTH_RANGE.min, REALISED_BANDWIDTH_RANGE.max);
    if (realised) {
      state.realisedBandwidth = this.bySegment(realised);
    }
    const overhead = this.numberList(
      params[URL_PARAMS.overhead], HARDWARE_SEGMENT_ORDER.length,
      TOKEN_OVERHEAD_RANGE.min, TOKEN_OVERHEAD_RANGE.max);
    if (overhead) {
      state.overheadMsPerToken = this.bySegment(overhead);
    }

    const grouping = this.oneOf(params[URL_PARAMS.grouping], Object.values(MatrixGroupingEnum));
    if (grouping) {
      state.matrixGrouping = grouping;
    }
    const filter = this.oneOf(params[URL_PARAMS.matrixFilter], [
      'all',
      ...Object.values(ConsumerTypeEnum) as string[],
      ...Object.values(HardwareSegmentEnum) as string[],
    ]);
    if (filter) {
      state.matrixFilter = filter;
    }
    const matrixSearch = this.text(params[URL_PARAMS.matrixSearch]);
    if (matrixSearch !== null) {
      state.matrixSearch = matrixSearch;
    }
    const explorerSearch = this.text(params[URL_PARAMS.explorerSearch]);
    if (explorerSearch !== null) {
      state.explorerSearch = explorerSearch;
    }

    const sort = (params[URL_PARAMS.sort] ?? '').trim();
    if (sort) {
      const descending = sort.startsWith('-');
      const column = descending ? sort.slice(1) : sort;
      if (this.isSortableColumn(column)) {
        state.sortColumn = column;
        state.sortDirection = descending ? -1 : 1;
      }
    }

    const horizonClass = this.oneOf(params[URL_PARAMS.horizonClass], Object.values(ModelClassEnum));
    if (horizonClass) {
      state.horizonClass = horizonClass;
    }
    const horizonYears = this.integer(params[URL_PARAMS.horizonYears], 1, 50);
    if (horizonYears !== null) {
      state.horizonYears = horizonYears;
    }

    const categories = (params[URL_PARAMS.horizonCategories] ?? '').trim();
    if (categories === 'none') {
      state.horizonCategories = [];
    } else if (categories) {
      const wanted = categories.split(',')
        .map(part => part.trim())
        .filter((part): part is ConsumerTypeEnum => (Object.values(ConsumerTypeEnum) as string[]).includes(part)) as ConsumerTypeEnum[];
      if (wanted.length) {
        // keep the page's own order, whatever order the URL listed them in
        state.horizonCategories = CONSUMER_TYPE_ORDER.filter(type => wanted.includes(type));
      }
    }

    return state;
  }

  // ── validation helpers ──────────────────────────────────────────────────────

  private static oneOf<T extends string>(value: string | null | undefined, allowed: T[]): T | null {
    const candidate = (value ?? '').trim();
    return (allowed as string[]).includes(candidate) ? candidate as T : null;
  }

  private static boolean(value: string | null | undefined): boolean | null {
    const candidate = (value ?? '').trim();
    if (candidate === '1' || candidate === 'true') {
      return true;
    }
    if (candidate === '0' || candidate === 'false') {
      return false;
    }
    return null;
  }

  private static integer(value: string | null | undefined, min: number, max: number): number | null {
    const candidate = (value ?? '').trim();
    if (!/^-?\d+$/.test(candidate)) {
      return null;
    }
    const parsed = Number.parseInt(candidate, 10);
    return parsed >= min && parsed <= max ? parsed : null;
  }

  /** A list of exactly `length` numbers in range, or null if any part fails. */
  private static numberList(value: string | null | undefined,
                            length: number,
                            min: number,
                            max: number): number[] | null {
    const candidate = (value ?? '').trim();
    if (!candidate) {
      return null;
    }
    const parts = candidate.split(',').map(part => Number.parseFloat(part.trim()));
    if (parts.length !== length) {
      return null;
    }
    if (parts.some(part => !Number.isFinite(part) || part < min || part > max)) {
      return null;
    }
    return parts;
  }

  private static text(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    // long enough for any machine name in the file, short enough not to be a payload
    return value.trim().slice(0, 80);
  }

  private static isSortableColumn(column: string): boolean {
    const fixed = ['manufacturer', 'name', 'type', 'year', 'memory', 'memoryType', 'bandwidth'];
    return fixed.includes(column)
      || MODEL_CLASSES.some(modelClass => `class:${modelClass.key}` === column);
  }

  private static segmentValues(bySegment: Record<HardwareSegmentEnum, number>): number[] {
    return HARDWARE_SEGMENT_ORDER.map(segment => bySegment[segment]);
  }

  private static bySegment(values: number[]): Record<HardwareSegmentEnum, number> {
    return HARDWARE_SEGMENT_ORDER.reduce((map, segment, index) => {
      map[segment] = values[index];
      return map;
    }, {} as Record<HardwareSegmentEnum, number>);
  }

  private static sameNumbers(left: number[], right: number[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private static sameCategories(left: ConsumerTypeEnum[], right: ConsumerTypeEnum[]): boolean {
    return left.length === right.length && left.every(type => right.includes(type));
  }

  /** Half-steps read better than long decimals in a URL. */
  private static joinNumbers(values: number[]): string {
    return values.map(value => Number.isInteger(value) ? String(value) : value.toFixed(1)).join(',');
  }
}
