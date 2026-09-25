import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';
import { ClassifierDecision } from '../../base/src/lib/classifier/interfaces/classifier-decision.interface';
import { LayaQuestion } from '../../laya/src/laya-question.interface';
import { LayaQuestionType } from '../../laya/src/laya-question-type.enum';
import { LayaAnswer } from '../../laya/src/laya-answer.interface';
import { ClassifierNormalizedQuestion } from './classifier-normalized-schema.interface';

/**
 * Maps explainer questions to Laya rows and Laya answers back to
 * `ClassifierDecision` objects. Pure; token counts are filled in by the engine.
 */
export class ClassifierSchemaMapper {
  /** Prepends the schema context to the question prompt, since Laya has no context slot. */
  static instructions(context: string, prompt: string): string {
    return context ? `${context}\n${prompt}` : prompt;
  }

  /** Prepends the per-call context to the input state. */
  static state(input: string, callContext: string | undefined): string {
    return callContext ? `${callContext}\n${input}` : input;
  }

  static toLayaQuestion(question: ClassifierNormalizedQuestion, context: string): LayaQuestion {
    const instructions = ClassifierSchemaMapper.instructions(context, question.prompt);
    switch (question.type) {
      case ClassifierQuestionType.BINARY: {
        const described = (label: string) => question.options.find((o) => o.label === label)?.description ?? null;
        return {
          type: LayaQuestionType.NOUL,
          instructions,
          options: [
            { label: 'false', description: described('false') },
            { label: 'true', description: described('true') },
          ],
        };
      }
      case ClassifierQuestionType.CATEGORICAL:
        return {
          type: LayaQuestionType.CHOICE,
          instructions,
          options: question.options.map((o) => ({ label: o.label, description: o.description ?? null })),
        };
      case ClassifierQuestionType.ORDINAL:
        return {
          type: LayaQuestionType.SCORE,
          instructions,
          options: question.options.map((o) => ({ label: o.label, description: o.description ?? null })),
        };
    }
  }

  /** Labels in decision order. Binary decisions list `true` first, as in the explainer. */
  static labels(question: ClassifierNormalizedQuestion): string[] {
    if (question.type === ClassifierQuestionType.BINARY) return ['true', 'false'];
    return question.options.map((o) => o.label);
  }

  /**
   * Ordinal levels: the numeric labels when every label is a finite number
   * (the explainer's `"1"`..`"5"` example gives 4.78), otherwise the zero-based index.
   */
  static levels(question: ClassifierNormalizedQuestion): number[] | undefined {
    if (question.type !== ClassifierQuestionType.ORDINAL) return undefined;
    const parsed = question.options.map((o) => Number(o.label));
    if (parsed.every((n) => Number.isFinite(n)) && question.options.every((o) => o.label.trim() !== '')) {
      return parsed;
    }
    return question.options.map((_, i) => i);
  }

  static toDecision(
    id: string,
    type: ClassifierQuestionType,
    labels: string[],
    levels: number[] | undefined,
    answer: LayaAnswer,
  ): ClassifierDecision {
    if (type === ClassifierQuestionType.BINARY) {
      const pTrue = answer.probabilities[1];
      return {
        id,
        label: pTrue >= 0.5 ? 'true' : 'false',
        probability: pTrue,
        confidence: answer.confidence,
        probabilities: [
          { label: 'true', probability: pTrue },
          { label: 'false', probability: 1 - pTrue },
        ],
      };
    }

    const decision: ClassifierDecision = {
      id,
      label: labels[answer.argmaxIndex],
      confidence: answer.confidence,
      probabilities: labels.map((label, i) => ({ label, probability: answer.probabilities[i] })),
    };
    if (type === ClassifierQuestionType.ORDINAL && levels) {
      decision.expectedScore = answer.probabilities.reduce((acc, p, i) => acc + levels[i] * p, 0);
    }
    return decision;
  }
}
