import { ClassifierExpectedInput } from './classifier-expected-input.interface';
import { ClassifierQuestion } from './classifier-question.interface';

/**
 * Serializable part of `ClassifierCreateOptions` (no `monitor`, no `signal`).
 * `questions` is optional only for `availability()`.
 */
export interface ClassifierSchema {
  context?: string;
  expectedInputs?: ClassifierExpectedInput[];
  questions?: ClassifierQuestion[];
}
