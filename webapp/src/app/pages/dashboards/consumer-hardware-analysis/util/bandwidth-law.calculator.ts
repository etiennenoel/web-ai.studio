/**
 * The arithmetic behind every derived number on the page: a through-origin fit of
 * throughput against bandwidth, and compound growth between two dated values.
 */
export class BandwidthLawCalculator {

  /**
   * Least-squares slope of `y = slope × x`, forced through the origin — a machine with
   * no memory bandwidth generates no tokens, so the line has no free intercept to spend.
   */
  static fitSlopeThroughOrigin(points: {x: number, y: number}[]): number {
    const sumXy = points.reduce((total, point) => total + point.x * point.y, 0);
    const sumXx = points.reduce((total, point) => total + point.x * point.x, 0);
    return sumXx === 0 ? 0 : sumXy / sumXx;
  }

  /** Coefficient of determination of that fit, against the mean of the observations. */
  static rSquared(points: {x: number, y: number}[], slope: number): number {
    if (points.length < 2) {
      return 0;
    }
    const mean = points.reduce((total, point) => total + point.y, 0) / points.length;
    const residual = points.reduce((total, point) => total + Math.pow(point.y - slope * point.x, 2), 0);
    const variance = points.reduce((total, point) => total + Math.pow(point.y - mean, 2), 0);
    return variance === 0 ? 0 : 1 - residual / variance;
  }

  /** Compound annual growth rate between two values a whole number of years apart. */
  static compoundAnnualGrowth(fromValue: number, toValue: number, years: number): number {
    if (years <= 0 || fromValue <= 0 || toValue <= 0) {
      return 0;
    }
    return Math.pow(toValue / fromValue, 1 / years) - 1;
  }

  /** A value grown at `rate` for `years`. */
  static grow(value: number, rate: number, years: number): number {
    return value * Math.pow(1 + rate, years);
  }

  /**
   * The first year `value` reaches `target` when growing at `rate` — fractional, so the
   * caller decides how to round it.
   */
  static yearsToReach(value: number, target: number, rate: number): number {
    if (value >= target) {
      return 0;
    }
    if (rate <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.log(target / value) / Math.log(1 + rate);
  }
}
