import { describe, expect, it } from 'vitest';
import { ClassifierSchemaValidator } from './classifier-schema.validator';
import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';

const VALID = {
  context: 'Support router',
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  questions: [
    { id: 'is_urgent', type: 'boolean', prompt: 'Urgent?' },
    { id: 'category', type: 'choice', prompt: 'Which?', options: [{ label: 'bug' }, { label: 'billing', description: 'Money' }] },
    { id: 'severity', type: 'score', prompt: 'Rate.' },
  ],
};

describe('ClassifierSchemaValidator', () => {
  it('normalizes aliases and defaults', () => {
    const schema = ClassifierSchemaValidator.validate(VALID, true);
    expect(schema.questions.map((q) => q.type)).toEqual([
      ClassifierQuestionType.BOOLEAN,
      ClassifierQuestionType.CHOICE,
      ClassifierQuestionType.SCORE,
    ]);
    expect(schema.questions[0].options).toEqual([]);
    expect(schema.questions[2].options).toEqual([
      { label: '1' },
      { label: '2' },
      { label: '3' },
      { label: '4' },
      { label: '5' },
    ]);
    expect(schema.context).toBe('Support router');
  });

  it('still accepts legacy binary, categorical, and ordinal aliases', () => {
    const schema = ClassifierSchemaValidator.validate(
      {
        questions: [
          { id: 'a', type: 'binary', prompt: 'A?' },
          { id: 'b', type: 'categorical', prompt: 'B?', options: [{ label: 'x' }, { label: 'y' }] },
          { id: 'c', type: 'ordinal', prompt: 'C?', options: [{ label: '1' }, { label: '2' }] },
        ],
      },
      true,
    );
    expect(schema.questions.map((q) => q.type)).toEqual([
      ClassifierQuestionType.BOOLEAN,
      ClassifierQuestionType.CHOICE,
      ClassifierQuestionType.SCORE,
    ]);
  });

  it('accepts an empty dictionary for availability()', () => {
    expect(ClassifierSchemaValidator.validate(undefined, false).questions).toEqual([]);
    expect(() => ClassifierSchemaValidator.validate({}, true)).toThrow(TypeError);
  });

  it('rejects malformed members with TypeError', () => {
    expect(() => ClassifierSchemaValidator.validate('nope', true)).toThrow(TypeError);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'weird', prompt: 'x' }] }, true)).toThrow(/ClassifierQuestionType/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'choice', prompt: 'x' }] }, true)).toThrow(/options is required/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'choice', prompt: 'x', options: [{ label: 'one' }] }] }, true)).toThrow(/at least 2/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'boolean', prompt: 'x' }, { id: 'a', type: 'boolean', prompt: 'y' }] }, true)).toThrow(/Duplicate question id/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'choice', prompt: 'x', options: [{ label: 'b' }, { label: 'b' }] }] }, true)).toThrow(/duplicate label/);
    expect(() => ClassifierSchemaValidator.validate({ questions: [{ id: 'a', type: 'boolean', prompt: 'x', options: [{ label: 'maybe' }] }] }, true)).toThrow(/"true" and "false"/);
  });
});
