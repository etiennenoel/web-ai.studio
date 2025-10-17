import {ApiEnum} from './api.enum';
import {advancedFormControl, FieldType, FormControlTypeEnum} from '@magieno/common';
import {InferenceStatusEnum} from '../../enums/inference-status.enum';

export class EvalsRow {
  @advancedFormControl({
    type: FormControlTypeEnum.Select,
    items: [
      {
        id: ApiEnum.Summarizer,
        label: "Summarizer",
      },
      {
        id: ApiEnum.Prompt,
        label: "Prompt",
      }
    ],
  })
  api?: ApiEnum;

  @advancedFormControl({
    type: FormControlTypeEnum.Input,
    fieldType: FieldType.String,
  })
  context: string = "";

  @advancedFormControl({
    type: FormControlTypeEnum.Input,
    fieldType: FieldType.String,
  })
  input: string = "";

  status: InferenceStatusEnum = InferenceStatusEnum.Idle;

  output: string = "";
}
