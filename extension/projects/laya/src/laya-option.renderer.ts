import { LayaQuestion } from './laya-question.interface';
import { LayaQuestionType } from './laya-question-type.enum';

const NOUL_FALSE_DEFAULT = 'no, the statement does not hold';
const NOUL_TRUE_DEFAULT = 'yes, the statement holds';

/**
 * Renders option texts in option order, exactly as laya 0.3.4 `render_options`.
 * Only null or empty descriptions mean "no description".
 */
export class LayaOptionRenderer {
  static render(question: LayaQuestion): string[] {
    switch (question.type) {
      case LayaQuestionType.CHOICE:
        return question.options.map((o) =>
          o.description === null || o.description === '' ? o.label : `${o.label}: ${o.description}`,
        );
      case LayaQuestionType.SCORE:
        return question.options.map((o, i) => `level ${i}: ${o.description ?? o.label}`);
      case LayaQuestionType.NOUL: {
        const falseOption = question.options.find((o) => o.label === 'false');
        const trueOption = question.options.find((o) => o.label === 'true');
        const falseText = falseOption?.description || NOUL_FALSE_DEFAULT;
        const trueText = trueOption?.description || NOUL_TRUE_DEFAULT;
        return [`false: ${falseText}`, `true: ${trueText}`];
      }
    }
  }
}
