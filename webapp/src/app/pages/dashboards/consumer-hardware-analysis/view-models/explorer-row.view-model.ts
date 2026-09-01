import {ExplorerCellViewModel} from './explorer-cell.view-model';

/** One machine as a table row. */
export interface ExplorerRowViewModel {
  deviceName: string;
  cells: ExplorerCellViewModel[];
}
