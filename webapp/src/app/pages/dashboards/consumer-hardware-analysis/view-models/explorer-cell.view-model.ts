/** One rendered table cell. */
export interface ExplorerCellViewModel {
  columnKey: string;
  display: string;

  numeric: boolean;

  /** Set on throughput cells that carry a figure, so the tag picks up the speed ramp. */
  rampStep: number | null;

  /** True for "n/a" and "won't fit", which are stated rather than left blank. */
  muted: boolean;

  /** True when the figure was modelled from bandwidth rather than measured. */
  modelled?: boolean;

  title: string;
}
