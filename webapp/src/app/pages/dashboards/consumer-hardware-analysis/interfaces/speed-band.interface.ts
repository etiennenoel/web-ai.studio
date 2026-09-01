import {SpeedBandEnum} from '../enums/speed-band.enum';

/** One of the five speed bands, with the interval it currently claims. */
export interface SpeedBandInterface {
  key: SpeedBandEnum;

  name: string;

  /** Index in the scale, 0 = crawling … 4 = instant. Doubles as the ramp step. */
  index: number;

  /** Inclusive lower edge, tok/s. Always 0 for the slowest band. */
  low: number;

  /** Exclusive upper edge, tok/s. Infinity for the fastest band. */
  high: number;

  /** The interval as shown to the reader, e.g. "15–30" or "50+". */
  rangeLabel: string;
}
