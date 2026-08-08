import {ConsumerHardwareTabEnum} from '../enums/consumer-hardware-tab.enum';
import {ConsumerTypeEnum} from '../enums/consumer-type.enum';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {MatrixGroupingEnum} from '../enums/matrix-grouping.enum';
import {ModelClassEnum} from '../enums/model-class.enum';
import {TaskModeEnum} from '../enums/task-mode.enum';

/**
 * Everything a reader can change about the view. This is the whole contract for the
 * shareable URL: anything here that differs from the default appears as a query
 * parameter, and anything absent from the URL falls back to the default.
 */
export interface DashboardViewStateInterface {
  /** Which task the page is describing. It moves several other defaults with it, so it is
   *  read out of the URL before anything else. */
  mode: TaskModeEnum;

  tab: ConsumerHardwareTabEnum;

  /** The hero's "as of" year. Its default depends on the dataset, not on the page. */
  year: number;

  showModelledValues: boolean;

  advancedOpen: boolean;

  /** Lower edge of every band but the slowest, which is pinned to zero. */
  bandLows: number[];

  /** Upper edge of every band but the fastest, which has no ceiling. Kept separately
   *  because the reader is allowed to leave neighbours disagreeing. */
  bandHighs: number[];

  contextTokens: number;

  /** Percent of rated peak, per hardware family. */
  realisedBandwidth: Record<HardwareSegmentEnum, number>;

  /** Milliseconds per token, per hardware family. */
  overheadMsPerToken: Record<HardwareSegmentEnum, number>;

  /** Text tokens a second of speech is worth. Speech mode only. */
  tokensPerSecondOfAudio: number;

  /** Compute per byte of bandwidth, per hardware family. Speech mode only. */
  flopPerByte: Record<HardwareSegmentEnum, number>;

  matrixGrouping: MatrixGroupingEnum;

  /** A group key, or 'all'. */
  matrixFilter: string;

  matrixSearch: string;

  explorerSearch: string;

  sortColumn: string;

  sortDirection: 1 | -1;

  horizonClass: ModelClassEnum;

  /** How many years past the last measured one the projection runs. */
  horizonYears: number;

  horizonCategories: ConsumerTypeEnum[];
}
