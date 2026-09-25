import { describe, expect, it } from 'vitest';
import { ClassifierSchemaValidator } from './classifier-schema.validator';
import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';

const VALID = {
  context: 'Support router',
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  questions: [
    { id: 'is_urgent', type: 'binary', prompt: 'Urgent?' },
    { id: 'category', type: 'choice', prompt: 'Which?', options: [{ label: 'bug' }, { label: 'billing', description: 'Money' }] },
    { id: 'severity', type: 'score', prompt: 'Rate.', options: [{ label: '1' }, { label: '2' }, { label: '3' }] },
  ],
};

describe('ClassifierSchemaValidator', () => {
  it('normalizes aliases and defaults', () => {
    const schema = ClassifierSchemaValidator.validate(VALID, true);
    expect(schema.questions.map((q) => q.type)).toEqual([
      ClassifierQuestionType.BINARY,
      ClassifierQuestionType.CATEGORICAL,
      ClassifierQuestionType.ORDINAL,
    ]);
    expect(schema.questions[0].options).toEqual([]);
    expect(schema.context).toBe('Support router');
  });

  it('accepts an empty dictionary for availability()', () => {
    expect(ClassifierSchemaValidator.validate(undefined, false).questions).toEqual([]);
    expect(() => ClassifierSchemaValidator.validate({}, true)).toThrow(TypeError);
  });

  it('rejects malformed members with TypeError', () => {
    expect(() => ClassifierSchemaValidator.validate('nope', true)).toThrow(TypeError);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'weird', prompt: 'x' }] }, true)).toThrow(/ClassifierQuestionType/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'categorical', prompt: 'x' }] }, true)).toThrow(/options is required/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'categorical', prompt: 'x', options: [{ label: 'one' }] }] }, true)).toThrow(/at least 2/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'binary', prompt: 'x' }, { id: 'a', type: 'binary', prompt: 'y' }] }, true)).toThrow(/Duplicate question id/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'categorical', prompt: 'x', options: [{ label: 'b' }, { label: 'b' }] }] }, true)).toThrow(/duplicate label/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'binary', prompt: 'x', options: [{ label: 'maybe' }] }] }, true)).toThrow(/"true" and "false"/);
  });
});
