/**
 * One Summarizer create option a row can set, the row field that holds the choice, and the
 * values the API accepts for it.
 */
export interface SummarizerOption {
  /** The row field the choice is stored in. */
  field: 'summarizerLength' | 'summarizerType' | 'summarizerPreference';

  /** The name the Summarizer create options use. */
  option: 'length' | 'type' | 'preference';

  /** Column label, shown above the dropdown and used in warnings. */
  label: string;

  /** Every value the API accepts, in the order the dropdown lists them. */
  choices: string[];
}
