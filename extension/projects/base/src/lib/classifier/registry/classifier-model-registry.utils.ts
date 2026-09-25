import { CLASSIFIER_MODEL_REGISTRY } from './classifier-model-registry.const';
import { ClassifierModelVariant } from '../interfaces/classifier-model-variant.interface';
import { ClassifierModelFile } from '../interfaces/classifier-model-file.interface';

export function findClassifierModelVariant(id: string): ClassifierModelVariant | undefined {
  return CLASSIFIER_MODEL_REGISTRY.find((v) => v.id === id);
}

export function classifierModelTotalBytes(variant: ClassifierModelVariant): number {
  return variant.files.reduce((acc, f) => acc + f.bytes, 0);
}

export function classifierModelFileUrl(variant: ClassifierModelVariant, file: ClassifierModelFile): string {
  return `https://huggingface.co/${variant.repository}/resolve/main/${file.path}`;
}
