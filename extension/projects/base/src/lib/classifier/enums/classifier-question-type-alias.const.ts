import { ClassifierQuestionType } from './classifier-question-type.enum';

/** Alias resolution for the `type` member of a ClassifierQuestion. */
export const CLASSIFIER_QUESTION_TYPE_ALIASES: Record<string, ClassifierQuestionType> = {
  boolean: ClassifierQuestionType.BOOLEAN,
  binary: ClassifierQuestionType.BOOLEAN,
  choice: ClassifierQuestionType.CHOICE,
  categorical: ClassifierQuestionType.CHOICE,
  score: ClassifierQuestionType.SCORE,
  ordinal: ClassifierQuestionType.SCORE,
};
