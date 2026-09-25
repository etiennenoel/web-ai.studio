import { ClassifierCompiledQuestion } from './classifier-compiled-question.interface';

export interface ClassifierSession {
  id: string;
  variantId: string;
  questions: ClassifierCompiledQuestion[];
  contextWindow: number;
  contextUsage: number;
}
