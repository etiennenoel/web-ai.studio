import { LayaQuestionType } from './laya-question-type.enum';

/** Decoded answer for one question, in option order. */
export interface LayaAnswer {
  type: LayaQuestionType;
  /** Calibrated probability per option, in the question's option order. */
  probabilities: number[];
  /** Index of the first argmax option. */
  argmaxIndex: number;
  /** Expected zero-based level index (score questions only). */
  expectedIndex?: number;
  /** Entropy-based confidence for choice/score, `max(p, 1-p)` for noul. */
  confidence: number;
  /** Direct-answer probability from the act head. Saturates at 1.0 on the published fixtures. */
  actProbability: number;
  /** Real token count of the built sequence. */
  inputTokens: number;
}
