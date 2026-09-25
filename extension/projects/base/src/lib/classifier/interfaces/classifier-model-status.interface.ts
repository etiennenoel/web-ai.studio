import { ClassifierModelState } from '../enums/classifier-model-state.enum';

export interface ClassifierModelStatus {
  variantId: string;
  state: ClassifierModelState;
  /** Bytes present on disk. */
  cachedBytes: number;
  totalBytes: number;
  /** Whether this variant is currently compiled in memory. */
  loaded: boolean;
  /** Accelerator in use when loaded. */
  accelerator?: 'webgpu' | 'wasm';
}
