import { LayaQuestionType } from './laya-question-type.enum';

/** Position of each question type in the `qtype_onehot [1,3]` input. */
export const LAYA_QUESTION_TYPE_INDEX: Record<LayaQuestionType, number> = {
  [LayaQuestionType.CHOICE]: 0,
  [LayaQuestionType.SCORE]: 1,
  [LayaQuestionType.NOUL]: 2,
};
