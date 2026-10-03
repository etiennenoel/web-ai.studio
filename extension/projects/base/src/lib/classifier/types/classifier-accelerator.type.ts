export type ClassifierAccelerator = 'webgpu' | 'webnn' | 'wasm';
export type ClassifierAcceleratorPreference = 'auto' | ClassifierAccelerator;
export type ClassifierWebNNDevicePreference = 'auto' | 'npu' | 'gpu' | 'cpu';

export const CLASSIFIER_ACCELERATOR_PREFERENCES: ReadonlyArray<ClassifierAcceleratorPreference> = [
  'auto',
  'webgpu',
  'webnn',
  'wasm',
];

export const CLASSIFIER_WEBNN_DEVICE_PREFERENCES: ReadonlyArray<ClassifierWebNNDevicePreference> = [
  'auto',
  'npu',
  'gpu',
  'cpu',
];
