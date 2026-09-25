import { ClassifierModelInputMode } from '../enums/classifier-model-input-mode.enum';
import { ClassifierModelFile } from './classifier-model-file.interface';

/** One downloadable model configuration the polyfill can run. */
export interface ClassifierModelVariant {
  id: string;
  family: string;
  name: string;
  description: string;
  /** Hugging Face repository id, e.g. `litert-community/laya-LiteRT`. */
  repository: string;
  /** Static token window of the main graph. */
  window: number;
  /** Head budget for instructions plus options. */
  headMaxLen: number;
  /** Hidden size of `pooled_cls`. */
  hidden: number;
  inputMode: ClassifierModelInputMode;
  /** BCP-47 tags, or `multilingual` when any language is accepted. */
  languages: string[];
  /** Whether the publisher reports GPU compilation for this file. */
  gpuCompiles: boolean;
  files: ClassifierModelFile[];
}
