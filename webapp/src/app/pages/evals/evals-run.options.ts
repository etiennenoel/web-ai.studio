import {EvalsRow} from './evals.row';
import {advancedFormArray} from '@magieno/common';

export class EvalsRunOptions {
  @advancedFormArray({
    emptyNumberOfChildrenFormToCreate: 1,
    elementClassType: EvalsRow,
  })
  rows: EvalsRow[] = []
}
