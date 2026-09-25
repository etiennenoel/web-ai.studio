import { LayaQuestionType } from './laya-question-type.enum';
import { LayaOption } from './laya-option.interface';

/** A single Laya question row. One question equals one forward pass. */
export interface LayaQuestion {
  type: LayaQuestionType;
  instructions: string;
  options: LayaOption[];
}
