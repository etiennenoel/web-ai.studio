/**
 * The three question types the Laya decision encoder understands.
 * The string values are the literal type names used in the prompt
 * (`choice question: ...`) and the index order is the `qtype_onehot` order.
 */
export enum LayaQuestionType {
  CHOICE = 'choice',
  SCORE = 'score',
  NOUL = 'noul',
}
