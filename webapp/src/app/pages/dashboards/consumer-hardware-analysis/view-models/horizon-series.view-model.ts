import {ConsumerTypeEnum} from '../enums/consumer-type.enum';
import {HorizonPointViewModel} from './horizon-point.view-model';

/** One hardware category's line: measured years, then its own trend continued. */
export interface HorizonSeriesViewModel {
  type: ConsumerTypeEnum;
  label: string;

  /** Colour slot, fixed per category so a category keeps its colour when others hide. */
  colorSlot: number;

  /** Polyline through the years the dataset measures. */
  measuredPoints: string;

  /** Polyline continuing from the newest measured year at the fitted rate. */
  projectedPoints: string;

  points: HorizonPointViewModel[];

  labelX: number;
  labelY: number;
  labelDetail: string;
}
