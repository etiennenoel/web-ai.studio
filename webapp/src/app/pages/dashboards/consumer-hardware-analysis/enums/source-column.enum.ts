/**
 * The throughput columns the source CSV actually publishes. Several displayed model
 * sizes can come from one column: the file measures 1–4B as a single bucket.
 */
export enum SourceColumnEnum {
  Tiny = 'tiny',
  Nano = 'nano',
  Light = 'light',
  Mid = 'mid',
  Large = 'large',
  Xl = 'xl',
}
