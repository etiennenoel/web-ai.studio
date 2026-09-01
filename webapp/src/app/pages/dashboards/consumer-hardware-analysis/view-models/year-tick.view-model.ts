/** A year on the hero's timeline. */
export interface YearTickViewModel {
  year: number;

  /** Position along the track, inset by half a thumb so it lands under the handle. */
  offsetStyle: string;

  active: boolean;

  tooltipTitle: string;
  tooltipLines: string[];
}
