import { ClassifierModelState } from '../enums/classifier-model-state.enum';
import { ClassifierAccelerator, ClassifierWebNNDevicePreference } from '../types/classifier-accelerator.type';

export interface ClassifierModelStatus {
  variantId: string;
  state: ClassifierModelState;
  /** Bytes present on disk. */
  cachedBytes: number;
  totalBytes: number;
  /** Whether this variant is currently compiled in memory. */
  loaded: boolean;
  /** Accelerator in use when loaded. */
  accelerator?: ClassifierAccelerator;
  /** WebNN device preference in use when loaded on WebNN. */
  webnnDevicePreference?: ClassifierWebNNDevicePreference;
}
