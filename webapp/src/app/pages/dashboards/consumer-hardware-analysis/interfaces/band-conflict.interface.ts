import {BandConflictKindEnum} from '../enums/band-conflict-kind.enum';

/** A disagreement between band edges, reported rather than silently corrected. */
export interface BandConflictInterface {
  kind: BandConflictKindEnum;

  /** Index of the band at fault, and of its neighbour where two are involved. */
  index: number;
  neighbourIndex?: number;

  /** Plain-language description, shown to the reader. */
  message: string;
}
