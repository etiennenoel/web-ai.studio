import { LayaGraphInputMode } from './laya-graph-input-mode.enum';
import { LayaEmbeddingTable } from './laya-embedding-table';

export interface LayaModelRunnerOptions {
  /** Static sequence window N of the main graph. */
  window: number;
  /** Hidden size D of `pooled_cls`. */
  hidden: number;
  padId: number;
  inputMode: LayaGraphInputMode;
  accelerator: 'webgpu' | 'wasm';
  /** Required when `inputMode` is INPUTS_EMBEDS. */
  embeddingTable?: LayaEmbeddingTable;
}
