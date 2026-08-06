/** One throughput cell of the source dataset, for one machine and one model class. */
export interface ThroughputFigureInterface {
  /** The figure in tokens/second, or null when the source has no number here. */
  tokensPerSecond: number | null;

  /** True when the source marks the model as too large for this machine ("—"). */
  wontFit: boolean;

  /** The Tiny column ships a min/max pair; the other columns are single values. */
  sourceRange: [number, number] | null;
}
