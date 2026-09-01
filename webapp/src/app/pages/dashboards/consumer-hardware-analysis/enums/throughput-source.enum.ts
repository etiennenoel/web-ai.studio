/** Where a throughput number in the matrix came from. */
export enum ThroughputSourceEnum {
  /** A figure present in the source dataset. */
  Measured = 'measured',
  /** Derived from the machine's bandwidth and the fitted class slope. */
  Modelled = 'modelled',
  /** The source marks the model as too large for this machine's memory. */
  WontFit = 'wont-fit',
  /** No figure in the source, and modelled values are switched off. */
  Missing = 'missing',
}
