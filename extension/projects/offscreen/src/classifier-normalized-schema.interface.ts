import { ClassifierExpectedInput } from '../../base/src/lib/classifier/interfaces/classifier-expected-input.interface';
import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';
import { ClassifierOption } from '../../base/src/lib/classifier/interfaces/classifier-option.interface';

export interface ClassifierNormalizedQuestion {
  id: string;
  type: ClassifierQuestionType;
  prompt: string;
  options: ClassifierOption[];
}

/** Output of the validator: aliases resolved, optional members defaulted. */
export interface ClassifierNormalizedSchema {
  context: string;
  expectedInputs: ClassifierExpectedInput[];
  questions: ClassifierNormalizedQuestion[];
}
