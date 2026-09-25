import { ClassifierOption } from './classifier-option.interface';

export interface ClassifierQuestion {
  id: string;
  /** `binary` | `categorical` | `ordinal`, or an alias (`boolean`, `choice`, `score`). */
  type: string;
  prompt: string;
  /** Required for categorical and ordinal questions. */
  options?: ClassifierOption[];
}
