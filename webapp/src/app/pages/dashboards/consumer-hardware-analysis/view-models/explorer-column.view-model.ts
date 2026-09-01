/** A sortable column of the explorer table. */
export interface ExplorerColumnViewModel {
  key: string;
  label: string;

  /** Text columns align left; every numeric column aligns right on tabular figures. */
  numeric: boolean;

  /** True for the six throughput columns, which render as speed-banded tags. */
  throughput: boolean;
}
