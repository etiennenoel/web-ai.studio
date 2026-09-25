/** Download progress emitted by the offscreen runtime for one request. */
export interface ClassifierProgressMessage {
  action: string;
  requestId: string;
  clientTabId?: number;
  /** Fraction in [0, 1]. */
  loaded: number;
  /** Variant being downloaded, for model management UIs. */
  variantId?: string;
}
