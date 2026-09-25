import { describe, expect, it } from 'vitest';
import { ClassifierSchemaMapper } from './classifier-schema.mapper';
import { ClassifierSchemaValidator } from './classifier-schema.validator';
import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';
import { LayaQuestionType } from '../../laya/src/laya-question-type.enum';
import { LayaAnswer } from '../../laya/src/laya-answer.interface';

describe('ClassifierSchemaMapper', () => {
  const schema = ClassifierSchemaValidator.validate(
    {
      context: 'Router',
      questions: [
        { id: 'urgent', type: 'binary', prompt: 'Urgent?' },
        { id: 'dept', type: 'categorical', prompt: 'Dept?', options: [{ label: 'bug', description: 'Crash' }, { label: 'billing' }] },
        { id: 'sev', type: 'ordinal', prompt: 'Sev?', options: [{ label: '1', description: 'Low' }, { label: '2' }, { label: '5' }] },
        { id: 'mood', type: 'ordinal', prompt: 'Mood?', options: [{ label: 'sad' }, { label: 'ok' }, { label: 'happy' }] },
      ],
    },
    true,
  );

  it('maps question types and prepends the schema context', () => {
    const urgent = ClassifierSchemaMapper.toLayaQuestion(schema.questions[0], schema.context);
    expect(urgent.type).toBe(LayaQuestionType.NOUL);
    expect(urgent.instructions).toBe('Router\nUrgent?');
    expect(urgent.options.map((o) => o.label)).toEqual(['false', 'true']);

    const dept = ClassifierSchemaMapper.toLayaQuestion(schema.questions[1], schema.context);
    expect(dept.type).toBe(LayaQuestionType.CHOICE);
    expect(dept.options).toEqual([{ label: 'bug', description: 'Crash' }, { label: 'billing', description: null }]);

    expect(ClassifierSchemaMapper.toLayaQuestion(schema.questions[2], '').type).toBe(LayaQuestionType.SCORE);
  });

  it('uses numeric labels as levels, else zero-based indices', () => {
    expect(ClassifierSchemaMapper.levels(schema.questions[2])).toEqual([1, 2, 5]);
    expect(ClassifierSchemaMapper.levels(schema.questions[3])).toEqual([0, 1, 2]);
    expect(ClassifierSchemaMapper.levels(schema.questions[1])).toBeUndefined();
  });

  it('builds explainer-shaped decisions', () => {
    const noul: LayaAnswer = { type: LayaQuestionType.NOUL, probabilities: [0.03, 0.97], argmaxIndex: 1, confidence: 0.97, actProbability: 1, inputTokens: 10 };
    const urgent = ClassifierSchemaMapper.toDecision('urgent', ClassifierQuestionType.BINARY, ['true', 'false'], undefined, noul);
    expect(urgent).toEqual({
      id: 'urgent',
      label: 'true',
      probability: 0.97,
      confidence: 0.97,
      probabilities: [{ label: 'true', probability: 0.97 }, { label: 'false', probability: 0.030000000000000027 }],
    });

    const score: LayaAnswer = { type: LayaQuestionType.SCORE, probabilities: [0.1, 0.2, 0.7], argmaxIndex: 2, expectedIndex: 1.6, confidence: 0.4, actProbability: 1, inputTokens: 10 };
    const sev = ClassifierSchemaMapper.toDecision('sev', ClassifierQuestionType.ORDINAL, ['1', '2', '5'], [1, 2, 5], score);
    expect(sev.label).toBe('5');
    expect(sev.expectedScore).toBeCloseTo(0.1 + 0.4 + 3.5, 10);
    expect(sev.probability).toBeUndefined();
    expect(sev.probabilities.length).toBe(3);
  });

  it('prepends per-call context to the state', () => {
    expect(ClassifierSchemaMapper.state('hello', undefined)).toBe('hello');
    expect(ClassifierSchemaMapper.state('hello', 'ctx')).toBe('ctx\nhello');
  });
});
