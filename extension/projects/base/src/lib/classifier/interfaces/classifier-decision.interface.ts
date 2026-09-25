import { ClassifierOptionProbability } from './classifier-option-probability.interface';

/** One decision as described by the explainer. Present members depend on the question type. */
export interface ClassifierDecision {
  id: string;
  label: string;
  confidence: number;
  /** Binary only: calibrated P(true). */
  probability?: number;
  /** Ordinal only: expected score, sum(level_i * p_i). */
  expectedScore?: number;
  probabilities: ClassifierOptionProbability[];
}
