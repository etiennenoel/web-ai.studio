import { ClassifierDecision } from '../interfaces/classifier-decision.interface';

/** `decide()` / `classify()` resolves to a record keyed by question id. */
export type ClassifierResult = Record<string, ClassifierDecision>;
