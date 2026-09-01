/** One hardware type × model class in the hero grid. */
export interface HeroCellViewModel {
  /** Step of the speed ramp, or null when there is nothing to colour. */
  rampStep: number | null;

  /** "conversational", "won't fit", or empty when the type did not exist yet. */
  display: string;

  /** True when every machine behind the average was modelled rather than measured. */
  modelled: boolean;

  /** True when the class is too large for every machine of this type. */
  wontFit: boolean;

  tooltipTitle: string;
  tooltipLines: string[];
}
