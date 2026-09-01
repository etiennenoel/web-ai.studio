import {ModelClassEnum} from '../enums/model-class.enum';
import {SourceColumnEnum} from '../enums/source-column.enum';

/**
 * The fit of `tokens/second = slope × bandwidth` for one model size, over every measured
 * figure in its source column.
 */
export interface ModelClassFitInterface {
  modelClass: ModelClassEnum;

  /** The column the fit was made on. Three sizes share one column, and a size with no
   *  column has no fit of its own — its law is stated rather than measured. */
  sourceColumn?: SourceColumnEnum;

  /** True when this size is scaled off its column rather than measured directly. */
  derived: boolean;

  /** How many measured figures the underlying fit is built on. */
  sampleCount: number;

  /** Tokens per second per GB/s of memory bandwidth. */
  tokensPerGbps: number;

  /** Coefficient of determination of the through-origin fit on the source column, or null
   *  where there was nothing to fit. */
  rSquared: number | null;

  /** Bytes moved per generated token, in GB — the reciprocal of the slope. */
  gbPerToken: number;

  /**
   * Quantised weights divided by the bytes actually moved per token: how much of the
   * theoretical bandwidth the decode loop converts into tokens.
   */
  bandwidthEfficiency: number;
}
