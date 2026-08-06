/** A compound-growth trend fitted through a series of yearly values. */
export interface LogTrendInterface {
  /** Compound growth per year, as a fraction. Negative when the series is falling. */
  ratePerYear: number;

  lastYear: number;

  lastValue: number;

  /** The trend's value in a given year; flat at or before the last measured year. */
  valueAt(year: number): number;
}
