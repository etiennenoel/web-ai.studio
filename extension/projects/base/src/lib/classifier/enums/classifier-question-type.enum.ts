/**
 * Question modalities of the Decisions API explainer. `binary`, `categorical`
 * and `ordinal` are accepted aliases and normalized to the canonical values.
 */
export enum ClassifierQuestionType {
  BOOLEAN = 'boolean',
  CHOICE = 'choice',
  SCORE = 'score',
}
