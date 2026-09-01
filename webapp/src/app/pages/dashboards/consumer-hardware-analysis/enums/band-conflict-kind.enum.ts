/** Ways the reader's band edges can disagree with each other. */
export enum BandConflictKindEnum {
  /** A band ends before it starts. */
  Inverted = 'inverted',
  /** Two neighbours both claim the same range. */
  Overlap = 'overlap',
  /** A range between two neighbours belongs to no band. */
  Gap = 'gap',
}
