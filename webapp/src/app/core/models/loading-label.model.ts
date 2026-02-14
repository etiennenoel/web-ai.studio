export type LoadingLabelType = 'functional' | 'educational' | 'humor';
export type LoadingLabelPlatform = 'generic' | 'chrome' | 'edge';

export interface LoadingLabel {
  text: string;
  type: LoadingLabelType;
  platform: LoadingLabelPlatform;
}

export interface LoadingLabelsConfig {
  receipt: LoadingLabel[];
  proof_of_work: LoadingLabel[];
  engagement: LoadingLabel[];
  long_running: LoadingLabel[];
}
