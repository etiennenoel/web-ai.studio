import {ApiEnum} from './api.enum';
import {InferenceStatusEnum} from '../../enums/inference-status.enum';

export class EvalsRow {
  api: ApiEnum = ApiEnum.Prompt;

  context: string = "";

  input: string = "";

  images: string[] = [];

  audio: string[] = [];

  /** Structured output constraint: a JSON Schema document or a /regex/flags literal. */
  schema: string = "";

  /** Summarizer create options. A blank one leaves the choice to the model. */
  summarizerLength: string = "";

  summarizerType: string = "";

  summarizerPreference: string = "";

  status: InferenceStatusEnum = InferenceStatusEnum.Idle;

  output: string = "";

  /** Non-fatal problems found while ingesting or running this row. */
  warnings: string[] = [];
}
