import {SpeedBandEnum} from '../enums/speed-band.enum';

/** Slowest first, so the index doubles as the step of the speed ramp. */
export const SPEED_BAND_META: {key: SpeedBandEnum, name: string}[] = [
  {key: SpeedBandEnum.Crawling, name: 'crawling'},
  {key: SpeedBandEnum.Slow, name: 'slow'},
  {key: SpeedBandEnum.Readable, name: 'readable'},
  {key: SpeedBandEnum.Conversational, name: 'conversational'},
  {key: SpeedBandEnum.Instant, name: 'instant'},
];

/**
 * The four edges between the five bands, in tok/s. These are the only numbers on the
 * page a reader can change; everything else is derived from them.
 */
export const DEFAULT_BAND_EDGES = [10, 20, 35, 50];

/** Fastest band the reader is likely to care about, used as the forecast reference. */
export const DEFAULT_REFERENCE_BAND_INDEX = 3;

/** Top of the slider range, tok/s. */
export const BAND_SLIDER_MAX = 90;
