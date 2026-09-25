import { ClassifierDecision } from '../interfaces/classifier-decision.interface';

/** `classify()` resolves to a record keyed by question id. */
export type ClassifierResult = Record<string, ClassifierDecision>;
