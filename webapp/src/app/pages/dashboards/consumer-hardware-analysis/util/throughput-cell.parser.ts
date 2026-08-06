import {ThroughputFigureInterface} from '../interfaces/throughput-figure.interface';

/**
 * Reads one throughput cell. The dataset uses three conventions in the same column:
 * a number, a dash for "the model does not fit on this machine", and an en-dash range
 * such as `23–29` where the source is only confident to within a spread.
 */
export class ThroughputCellParser {

  static parse(raw: string | undefined): ThroughputFigureInterface {
    const value = (raw ?? '').trim();

    if (value === '') {
      return {tokensPerSecond: null, wontFit: false, sourceRange: null};
    }

    if (/^[-–—]$/.test(value)) {
      return {tokensPerSecond: null, wontFit: true, sourceRange: null};
    }

    const bounds = value.split(/[–—]/)
      .map(part => Number.parseFloat(part))
      .filter(part => !Number.isNaN(part));

    if (!bounds.length) {
      return {tokensPerSecond: null, wontFit: false, sourceRange: null};
    }

    const midpoint = bounds.reduce((total, bound) => total + bound, 0) / bounds.length;
    return {
      tokensPerSecond: midpoint,
      wontFit: false,
      sourceRange: bounds.length > 1 ? [bounds[0], bounds[bounds.length - 1]] : null,
    };
  }

  /** Reads a plain numeric cell, treating anything unparseable as absent. */
  static parseNumber(raw: string | undefined): number | null {
    const value = (raw ?? '').trim();
    if (value === '') {
      return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
