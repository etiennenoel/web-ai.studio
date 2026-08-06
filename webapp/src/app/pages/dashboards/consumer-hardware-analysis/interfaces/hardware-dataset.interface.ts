import {ModelClassEnum} from '../enums/model-class.enum';
import {HardwareDeviceInterface} from './hardware-device.interface';
import {ModelClassFitInterface} from './model-class-fit.interface';

/** Everything the dashboard needs, derived from the source CSV. */
export interface HardwareDatasetInterface {
  devices: HardwareDeviceInterface[];

  fits: Record<ModelClassEnum, ModelClassFitInterface>;

  /** Years the dataset covers, ascending. */
  years: number[];

  /** Measured figures for models of 1B parameters and up. */
  figureCountAtOneBillionPlus: number;

  /** Measured figures for the sub-billion Tiny class. */
  figureCountSubBillion: number;

  /**
   * Rows describing a system built around silicon the file lists separately, folded into
   * that chip so one memory bus is not counted twice.
   */
  foldedDevices: {name: string, into: string}[];
}
