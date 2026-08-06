/** One hardware family in the "overhead per token" strip. */
export interface EfficiencyItemViewModel {
  name: string;

  /** The overhead itself, e.g. "2 ms". */
  valueLabel: string;

  tooltipTitle: string;
  tooltipLines: string[];
}
