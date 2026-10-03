import { LayaGraphInputMode } from './laya-graph-input-mode.enum';
import { LayaEmbeddingTable } from './laya-embedding-table';

export type LayaAccelerator = 'webgpu' | 'webnn' | 'wasm';
export type LayaWebNNDevicePreference = 'cpu' | 'gpu' | 'npu';

export interface LayaGpuOptions {
  precision?: 'fp16' | 'fp32';
}

export interface LayaWebNNOptions {
  devicePreference?: LayaWebNNDevicePreference;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  precision?: 'fp32' | 'fp16';
}

export interface LayaModelRunnerOptions {
  /** Static sequence window N of the main graph. */
  window: number;
  /** Hidden size D of `pooled_cls`. */
  hidden: number;
  padId: number;
  inputMode: LayaGraphInputMode;
  accelerator: LayaAccelerator;
  /** Optional WebGPU delegate options. */
  gpuOptions?: LayaGpuOptions;
  /** Optional WebNN delegate options. */
  webNNOptions?: LayaWebNNOptions;
  /** Required when `inputMode` is INPUTS_EMBEDS. */
  embeddingTable?: LayaEmbeddingTable;
}
