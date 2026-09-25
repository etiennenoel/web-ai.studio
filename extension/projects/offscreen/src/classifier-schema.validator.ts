import { ClassifierSchema } from '../../base/src/lib/classifier/interfaces/classifier-schema.interface';
import { ClassifierQuestionType } from '../../base/src/lib/classifier/enums/classifier-question-type.enum';
import { CLASSIFIER_QUESTION_TYPE_ALIASES } from '../../base/src/lib/classifier/enums/classifier-question-type-alias.const';
import { ClassifierOption } from '../../base/src/lib/classifier/interfaces/classifier-option.interface';
import {
  ClassifierNormalizedQuestion,
  ClassifierNormalizedSchema,
} from './classifier-normalized-schema.interface';

const MIN_OPTIONS = 2;

/**
 * Validates `ClassifierCreateOptions` the way WebIDL dictionary conversion would:
 * malformed members throw `TypeError`. Shape rules come from the explainer.
 */
export class ClassifierSchemaValidator {
  static validate(input: unknown, requireQuestions: boolean): ClassifierNormalizedSchema {
    if (input === undefined || input === null) input = {};
    if (typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Classifier options must be a dictionary.');
    }
    const schema = input as ClassifierSchema;

    const context = schema.context === undefined ? '' : ClassifierSchemaValidator.string(schema.context, 'context');

    const expectedInputs = ClassifierSchemaValidator.expectedInputs(schema.expectedInputs);

    if (schema.questions === undefined) {
      if (requireQuestions) throw new TypeError("Failed to read the 'questions' property: Required member is undefined.");
      return { context, expectedInputs, questions: [] };
    }
    if (!Array.isArray(schema.questions)) {
      throw new TypeError("Failed to read the 'questions' property: The provided value cannot be converted to a sequence.");
    }
    if (requireQuestions && schema.questions.length === 0) {
      throw new TypeError("The 'questions' sequence must contain at least one question.");
    }

    const ids = new Set<string>();
    const questions = schema.questions.map((q, index) => {
      const question = ClassifierSchemaValidator.question(q, index);
      if (ids.has(question.id)) throw new TypeError(`Duplicate question id "${question.id}".`);
      ids.add(question.id);
      return question;
    });

    return { context, expectedInputs, questions };
  }

  private static expectedInputs(value: unknown): ClassifierNormalizedSchema['expectedInputs'] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      throw new TypeError("Failed to read the 'expectedInputs' property: The provided value cannot be converted to a sequence.");
    }
    return value.map((entry, i) => {
      if (typeof entry !== 'object' || entry === null) {
        throw new TypeError(`expectedInputs[${i}] must be a dictionary.`);
      }
      const type = ClassifierSchemaValidator.string((entry as { type: unknown }).type, `expectedInputs[${i}].type`);
      const languages = (entry as { languages?: unknown }).languages;
      if (languages !== undefined) {
        if (!Array.isArray(languages) || languages.some((l) => typeof l !== 'string')) {
          throw new TypeError(`expectedInputs[${i}].languages must be a sequence of strings.`);
        }
      }
      return { type, languages: languages as string[] | undefined };
    });
  }

  private static question(value: unknown, index: number): ClassifierNormalizedQuestion {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError(`questions[${index}] must be a dictionary.`);
    }
    const raw = value as Record<string, unknown>;
    const id = ClassifierSchemaValidator.string(raw['id'], `questions[${index}].id`);
    if (id === '') throw new TypeError(`questions[${index}].id must not be empty.`);

    const rawType = ClassifierSchemaValidator.string(raw['type'], `questions[${index}].type`);
    const type = CLASSIFIER_QUESTION_TYPE_ALIASES[rawType];
    if (!type) {
      throw new TypeError(
        `questions[${index}].type "${rawType}" is not a valid ClassifierQuestionType (binary, categorical, ordinal).`,
      );
    }

    const prompt = ClassifierSchemaValidator.string(raw['prompt'], `questions[${index}].prompt`);

    const options = ClassifierSchemaValidator.options(raw['options'], type, `questions[${index}]`);
    return { id, type, prompt, options };
  }

  private static options(value: unknown, type: ClassifierQuestionType, path: string): ClassifierOption[] {
    if (value === undefined) {
      if (type === ClassifierQuestionType.BINARY) return [];
      throw new TypeError(`${path}.options is required for ${type} questions.`);
    }
    if (!Array.isArray(value)) {
      throw new TypeError(`${path}.options must be a sequence of ClassifierOption.`);
    }
    const labels = new Set<string>();
    const options = value.map((o, i) => {
      if (typeof o !== 'object' || o === null) throw new TypeError(`${path}.options[${i}] must be a dictionary.`);
      const label = ClassifierSchemaValidator.string((o as { label: unknown }).label, `${path}.options[${i}].label`);
      if (label === '') throw new TypeError(`${path}.options[${i}].label must not be empty.`);
      if (labels.has(label)) throw new TypeError(`${path}.options has a duplicate label "${label}".`);
      labels.add(label);
      const description = (o as { description?: unknown }).description;
      if (description !== undefined && typeof description !== 'string') {
        throw new TypeError(`${path}.options[${i}].description must be a string.`);
      }
      return description === undefined ? { label } : { label, description };
    });

    if (type === ClassifierQuestionType.BINARY) {
      for (const o of options) {
        if (o.label !== 'true' && o.label !== 'false') {
          throw new TypeError(`${path}.options for binary questions may only describe "true" and "false".`);
        }
      }
      return options;
    }
    if (options.length < MIN_OPTIONS) {
      throw new TypeError(`${path}.options must contain at least ${MIN_OPTIONS} options.`);
    }
    return options;
  }

  private static string(value: unknown, path: string): string {
    if (typeof value !== 'string') {
      throw new TypeError(`Failed to read the '${path}' property: The provided value is not a string.`);
    }
    return value;
  }
}
