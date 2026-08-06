import {SourceColumnEnum} from '../enums/source-column.enum';

/** Where the dataset lives, relative to the site root. */
export const HARDWARE_DATASET_URL = '/data/llm-hardware-inference-table.csv';

/** Machine description columns of the source CSV. */
export const CSV_COLUMNS = {
  manufacturer: 'Manufacturer',
  name: 'Name',
  year: 'Year',
  minMemory: 'Min Memory(GB)',
  maxMemory: 'Max Memory(GB)',
  memoryType: 'Memory Type',
  bandwidth: 'Bandwidth(GBps)',
} as const;

/**
 * The Tiny column ships as a min/max pair; every other column is a single value. Tiny's
 * figure is the midpoint of its pair.
 */
export const CSV_TINY_MIN_COLUMN = 'Tiny [200-600M] Min (tok/s)';
export const CSV_TINY_MAX_COLUMN = 'Tiny [200-600M] Max (tok/s)';

/** Single-value throughput columns, keyed by source column. */
export const CSV_THROUGHPUT_COLUMNS: Partial<Record<SourceColumnEnum, string>> = {
  [SourceColumnEnum.Nano]: 'Nano (tok/s) [1-4B]',
  [SourceColumnEnum.Light]: 'Light (tok/s) [7-9B]',
  [SourceColumnEnum.Mid]: 'Mid (tok/s) [12-14B]',
  [SourceColumnEnum.Large]: 'Large(tok/s) [27-34B]',
  [SourceColumnEnum.Xl]: 'XL(tok/s) [70B+]',
};
