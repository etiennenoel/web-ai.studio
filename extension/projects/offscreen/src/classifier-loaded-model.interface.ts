import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import {
  ClassifierAccelerator,
  ClassifierAcceleratorPreference,
  ClassifierWebNNDevicePreference,
} from '../../base/src/lib/classifier/types/classifier-accelerator.type';
import { LayaHost } from '../../laya/src/laya-host';

export interface ClassifierLoadedModel {
  variant: ClassifierModelVariant;
  host: LayaHost;
  accelerator: ClassifierAccelerator;
  acceleratorPreference?: ClassifierAcceleratorPreference;
  webnnDevicePreference?: ClassifierWebNNDevicePreference;
}
