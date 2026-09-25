import { LayaQuestion } from '../../laya/src/laya-question.interface';
import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';

/** A schema question translated into a Laya row plus what is needed to build its decision. */
export interface ClassifierCompiledQuestion {
  id: string;
  type: ClassifierQuestionType;
  /** Option labels in the order given by the developer (binary: `true`, `false`). */
  labels: string[];
  /** Ordinal only: numeric level per option, used for `expectedScore`. */
  levels?: number[];
  laya: LayaQuestion;
  /** Token count of the question head; the static part of the context usage. */
  headTokens: number;
  /** Number of state tokens that fit without truncation. */
  stateRoom: number;
}
