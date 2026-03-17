import {ApiEnum} from './api.enum';
import {InferenceStatusEnum} from '../../enums/inference-status.enum';

export class EvalsRow {
  api?: ApiEnum;

  context: string = "";

  input: string = "";

  images: string[] = [];

  audio: string[] = [];

  status: InferenceStatusEnum = InferenceStatusEnum.Idle;

  output: string = "";
}
