import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import { LayaHost } from '../../laya/src/laya-host';

export interface ClassifierLoadedModel {
  variant: ClassifierModelVariant;
  host: LayaHost;
  accelerator: 'webgpu' | 'wasm';
}
