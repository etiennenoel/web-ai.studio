import {AxisTickViewModel} from './axis-tick.view-model';
import {HorizonBandViewModel} from './horizon-band.view-model';
import {HorizonSeriesViewModel} from './horizon-series.view-model';

/** Average throughput per hardware category, by year, with the speed bands behind it. */
export interface HorizonChartViewModel {
  width: number;
  height: number;

  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;

  /** Year ticks; `emphasis` marks every fifth year, `projected` the extrapolated ones. */
  xTicks: (AxisTickViewModel & {emphasis: boolean, projected: boolean})[];
  yTicks: AxisTickViewModel[];

  bands: HorizonBandViewModel[];
  series: HorizonSeriesViewModel[];

  /** Left edge of the shaded region that marks extrapolation. */
  projectedX: number;
  projectedWidth: number;
}
