import { ClassifierOption } from './classifier-option.interface';

export interface ClassifierQuestion {
  id: string;
  /** `boolean` | `choice` | `score`, or an alias (`binary`, `categorical`, `ordinal`). */
  type: string;
  prompt: string;
  /** Required for `choice` questions; optional for `score` questions (defaults to "1"-"5"). */
  options?: ClassifierOption[];
}
