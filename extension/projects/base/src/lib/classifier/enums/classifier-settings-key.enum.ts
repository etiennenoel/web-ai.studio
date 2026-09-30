/** Keys in the extension settings store that the Classifier polyfill reads. */
export enum ClassifierSettingsKey {
  POLYFILL_ENABLED = 'classifier_polyfill',
  MODEL_VARIANT = 'classifier_model_variant',
  ACCELERATOR = 'classifier_accelerator',
  WEBNN_DEVICE_PREFERENCE = 'classifier_webnn_device_preference',
}
