import {ConsumerTypeEnum} from '../enums/consumer-type.enum';

/** A toggle for one hardware category on the Horizon chart. */
export interface CategoryChipViewModel {
  type: ConsumerTypeEnum;
  label: string;
  colorSlot: number;

  active: boolean;

  /** "won't fit" or "no data" where the category has nothing to plot. */
  note: string;
}
