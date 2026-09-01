import {LogTrendInterface} from '../interfaces/log-trend.interface';

/**
 * Fits compound growth through yearly values: least squares on the log of the value
 * against the year, which makes a steady percentage gain a straight line.
 *
 * The result is anchored to the newest measured point rather than to the fitted line, so
 * a dashed continuation starts exactly where the solid line ends instead of jumping to
 * meet the regression.
 */
export class LogTrendCalculator {

  static fit(points: {year: number, value: number}[]): LogTrendInterface | null {
    const usable = points.filter(point => point.value > 0);
    if (usable.length < 2) {
      return null;
    }

    const meanYear = usable.reduce((total, point) => total + point.year, 0) / usable.length;
    const meanLog = usable.reduce((total, point) => total + Math.log(point.value), 0) / usable.length;

    let covariance = 0;
    let variance = 0;
    for (const point of usable) {
      const offset = point.year - meanYear;
      covariance += offset * (Math.log(point.value) - meanLog);
      variance += offset * offset;
    }
    if (!variance) {
      return null;
    }

    const slope = covariance / variance;
    const last = usable[usable.length - 1];

    return {
      ratePerYear: Math.exp(slope) - 1,
      lastYear: last.year,
      lastValue: last.value,
      valueAt(year: number): number {
        const years = year - last.year;
        return years <= 0 ? last.value : Math.max(last.value * Math.exp(slope * years), 0.1);
      },
    };
  }
}
