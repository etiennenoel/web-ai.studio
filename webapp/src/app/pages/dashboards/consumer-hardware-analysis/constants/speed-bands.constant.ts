import {SpeedBandEnum} from '../enums/speed-band.enum';
import {TaskModeEnum} from '../enums/task-mode.enum';

/**
 * Slowest first, so the index doubles as the step of the speed ramp.
 *
 * One set of names for both tasks. A reader who has learned what "readable" looks like on
 * a matrix of text speeds should not have to learn a second vocabulary to read the same
 * matrix of transcription speeds — only the numbers behind the names change with the task.
 */
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

/**
 * The same four edges for transcription, in multiples of realtime. 1× is the one that
 * matters — below it the machine falls behind the recording.
 */
export const DEFAULT_AUDIO_BAND_EDGES = [1, 3, 10, 30];

export const BAND_EDGES_BY_MODE: Record<TaskModeEnum, number[]> = {
  [TaskModeEnum.Text]: DEFAULT_BAND_EDGES,
  [TaskModeEnum.Audio]: DEFAULT_AUDIO_BAND_EDGES,
};

/** Top of the slider range, in each task's own unit. */
export const BAND_SLIDER_MAX_BY_MODE: Record<TaskModeEnum, number> = {
  [TaskModeEnum.Text]: 90,
  [TaskModeEnum.Audio]: 60,
};

/** Short and long forms of what a figure is counted in. */
export const BAND_UNIT_BY_MODE: Record<TaskModeEnum, string> = {
  [TaskModeEnum.Text]: 'tok/s',
  [TaskModeEnum.Audio]: '×',
};

export const BAND_UNIT_LONG_BY_MODE: Record<TaskModeEnum, string> = {
  [TaskModeEnum.Text]: 'tok/s',
  [TaskModeEnum.Audio]: '× realtime',
};

/** Fastest band the reader is likely to care about, used as the forecast reference. */
export const DEFAULT_REFERENCE_BAND_INDEX = 3;
