import {MatrixRowViewModel} from './matrix-row.view-model';

/** The matrix is grouped either by kind of machine or by hardware family. */
export interface MatrixGroupViewModel {
  key: string;
  label: string;

  /** What makes this group behave the way it does. */
  blurb: string;

  rows: MatrixRowViewModel[];
}
