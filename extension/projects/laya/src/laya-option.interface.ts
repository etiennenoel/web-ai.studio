/**
 * One option of a Laya question, in insertion order.
 *
 * - choice: `label` is the criterion key, `description` its text (null when absent).
 * - score: `label` is the zero-based level index as a string, `description` the level text.
 * - noul: exactly two options labelled `false` then `true`; `description` overrides the defaults.
 */
export interface LayaOption {
  label: string;
  description: string | null;
}
