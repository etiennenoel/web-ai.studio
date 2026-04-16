import { ApiCallStage } from '../enums/api-call-stage.enum';

/**
 * Shape of an API call record as stored in IndexedDB.
 * Aggregates data from multiple ApiCallPayload events (one per stage)
 * into a single record keyed by the call's id.
 */
export interface ApiCallRecord {
  /** Unique identifier for this method call. Also the IndexedDB key. */
  id: string;

  /** Session identifier linking related calls (create + subsequent methods). */
  sessionId: string;

  /** Which Chrome AI API (e.g., "LanguageModel", "Summarizer"). */
  api: string;

  /** The method name (e.g., "create", "prompt", "summarize"). */
  method: string;

  /** Origin of the page. */
  origin: string;

  /** Base timestamp for indexing (from the first stage received). */
  timestamp: number;

  /** Map of stage name -> timestamp, recording when each stage occurred. */
  timestamps: Partial<Record<ApiCallStage, number>>;

  /** Error message if the call failed. */
  errorMessage?: string;

  /** Sanitized .create() options. */
  options?: unknown;

  /** Sanitized method arguments. */
  args?: unknown;

  /** Sanitized response. */
  response?: unknown;

  /** Number of streaming chunks received. */
  chunkCount?: number;

  /** Token count from measureInputUsage(). */
  inputTokenCount?: number;

  /** Character count of primary input. */
  inputLength?: number;

  /** Whether the args/options contained media (blobs with dataUrls). */
  hasMedia?: boolean;

  /** Whether any media was audio. */
  hasAudio?: boolean;

  /** Whether any media was an image. */
  hasImage?: boolean;
}

/**
 * Shape of a setting record as stored in IndexedDB.
 */
export interface SettingRecord {
  /** Setting key (also the IndexedDB key). */
  key: string;

  /** Setting value (arbitrary). */
  value: unknown;
}
