/** One band's interval control in the advanced-settings panel. */
export interface BandSliderViewModel {
  index: number;
  name: string;
  rangeLabel: string;

  /** Slider positions, on the panel's square-root scale. */
  lowPosition: number;
  highPosition: number;

  /** Percentages for the filled part of the track. */
  fillLeftPercent: number;
  fillRightPercent: number;

  /** The slowest band starts at zero and the fastest has no ceiling. */
  lowLocked: boolean;
  highLocked: boolean;

  /** True when this band is party to a conflict. */
  conflicted: boolean;

  tooltipTitle: string;
  tooltipLines: string[];
}
