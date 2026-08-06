import {ModelClassEnum} from '../enums/model-class.enum';
import {ThroughputSourceEnum} from '../enums/throughput-source.enum';

/** One machine × one model class, as rendered in the matrix. */
export interface MatrixCellViewModel {
  modelClass: ModelClassEnum;
  source: ThroughputSourceEnum;

  /** Null for the two states that carry no number. */
  tokensPerSecond: number | null;

  /** The band name — what the speed feels like, which is the headline in each cell. */
  display: string;

  /** The figure behind it, e.g. "12 tok/s". Empty where there is none. */
  detail: string;

  /** Step of the speed ramp, or null when the cell carries no number. */
  rampStep: number | null;

  tooltipTitle: string;
  tooltipLines: string[];
}
