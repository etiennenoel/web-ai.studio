import {HeroCellViewModel} from './hero-cell.view-model';

/** One kind of machine, as of the year the reader picked. */
export interface HeroRowViewModel {
  label: string;

  /** "2024 · 3 machines", or "none yet" before this kind existed. */
  detail: string;

  /** False when nothing of this kind had been released by the chosen year. */
  present: boolean;

  cells: HeroCellViewModel[];

  tooltipTitle: string;
  tooltipLines: string[];
}
