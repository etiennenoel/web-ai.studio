import { ClassifierOptionProbability } from './classifier-option-probability.interface';

/** One decision as described by the explainer. Present members depend on the question type. */
export interface ClassifierDecision {
  id: string;
  label: string;
  /** Always the winning label's probability. */
  confidence: number;
  /** Boolean only: calibrated P("true"). */
  probability?: number;
  /** Score only: expected score, sum(level_i * p_i). */
  expectedScore?: number;
  probabilities: ClassifierOptionProbability[];
}
