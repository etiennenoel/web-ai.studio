import {MatrixCellViewModel} from './matrix-cell.view-model';

/** One machine's row of the matrix. */
export interface MatrixRowViewModel {
  deviceName: string;
  yearLabel: string;
  bandwidthLabel: string;
  memoryLabel: string;

  /** Width in percent of the widest bus in the dataset, for the inline bandwidth bar. */
  bandwidthBarPercent: number;

  cells: MatrixCellViewModel[];

  tooltipTitle: string;
  tooltipLines: string[];
}
