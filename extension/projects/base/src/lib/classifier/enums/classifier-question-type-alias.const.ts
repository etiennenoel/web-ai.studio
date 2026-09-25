import { ClassifierQuestionType } from './classifier-question-type.enum';

/** Alias resolution for the `type` member of a ClassifierQuestion. */
export const CLASSIFIER_QUESTION_TYPE_ALIASES: Record<string, ClassifierQuestionType> = {
  binary: ClassifierQuestionType.BINARY,
  boolean: ClassifierQuestionType.BINARY,
  categorical: ClassifierQuestionType.CATEGORICAL,
  choice: ClassifierQuestionType.CATEGORICAL,
  ordinal: ClassifierQuestionType.ORDINAL,
  score: ClassifierQuestionType.ORDINAL,
};
