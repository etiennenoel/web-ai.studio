/** What the runtime returns from `create()`. */
export interface ClassifierSessionInfo {
  sessionId: string;
  /** Total token window of the loaded model. */
  contextWindow: number;
  /** Largest per-question head footprint of the compiled schema. */
  contextUsage: number;
}
