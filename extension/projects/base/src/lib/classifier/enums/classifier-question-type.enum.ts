/**
 * Question modalities of the Classifier API explainer. `boolean`, `choice`
 * and `score` are accepted aliases and normalized to the canonical values.
 */
export enum ClassifierQuestionType {
  BINARY = 'binary',
  CATEGORICAL = 'categorical',
  ORDINAL = 'ordinal',
}
