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

  status: InferenceStatusEnum = InferenceStatusEnum.Idle;

  output: string = "";

  /** Non-fatal problems found while ingesting or running this row. */
  warnings: string[] = [];
}
