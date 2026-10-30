import { ApiCallStage } from '../enums/api-call-stage.enum';
import { ApiCallPayload } from '../interfaces/api-call-payload.interface';
import { ApiCallRecord } from '../interfaces/api-call-record.interface';

/**
 * Deterministically resolves the highest-lifecycle stage reached by an API call record,
 * regardless of out-of-order stage arrivals (such as late `input_usage` events).
 */
export function resolveRecordStage(
  record: Pick<ApiCallRecord, 'timestamps' | 'errorMessage'>,
  incomingStage?: ApiCallStage,
): ApiCallStage | undefined {
  if (record.timestamps[ApiCallStage.ERROR] !== undefined || record.errorMessage) {
    return ApiCallStage.ERROR;
  }
  if (record.timestamps[ApiCallStage.COMPLETED] !== undefined) {
    return ApiCallStage.COMPLETED;
  }
  if (record.timestamps[ApiCallStage.FIRST_TOKEN] !== undefined) {
    return ApiCallStage.FIRST_TOKEN;
  }
  if (record.timestamps[ApiCallStage.EXECUTE] !== undefined) {
    return ApiCallStage.EXECUTE;
  }
  if (record.timestamps[ApiCallStage.CREATE] !== undefined) {
    return ApiCallStage.CREATE;
  }
  return incomingStage;
}

/**
 * Deep-clones a sanitized value while stripping embedded base64 `dataUrl` strings
 * from serialized `{ __type: 'Blob' }` objects so active-session payloads never
 * exceed Chrome's 64 MiB IPC message limit or freeze UI JSON rendering.
 */
export function cloneWithoutDataUrls(
  value: unknown,
  mediaFlags: { hasMedia: boolean; hasAudio: boolean; hasImage: boolean },
  depth = 0,
): unknown {
  if (value === null || value === undefined || typeof value !== 'object' || depth > 12) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneWithoutDataUrls(item, mediaFlags, depth + 1));
  }

  const obj = value as Record<string, unknown>;
  if (obj['__type'] === 'Blob') {
    const dataUrl = typeof obj['dataUrl'] === 'string' ? obj['dataUrl'] : '';
    const mimeType = typeof obj['type'] === 'string' ? obj['type'] : '';
    const hadMedia = Boolean(dataUrl || obj['hasMedia']);

    if (hadMedia) {
      mediaFlags.hasMedia = true;
      if (
        mimeType.startsWith('audio/') ||
        dataUrl.startsWith('data:audio/') ||
        dataUrl.includes('audio')
      ) {
        mediaFlags.hasAudio = true;
      } else {
        mediaFlags.hasImage = true;
      }
    }

    const clonedBlob: Record<string, unknown> = { ...obj };
    if (hadMedia) {
      clonedBlob['hasMedia'] = true;
    }
    delete clonedBlob['dataUrl'];
    return clonedBlob;
  }

  const cloned: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = cloneWithoutDataUrls(obj[key], mediaFlags, depth + 1);
  }
  return cloned;
}

/**
 * Merges an incoming `ApiCallPayload` lifecycle event into an in-memory `ApiCallRecord`,
 * stripping heavy base64 `dataUrl` fields while preserving media metadata flags.
 */
export function mergePayloadIntoMemoryRecord(
  existing: ApiCallRecord | undefined,
  data: ApiCallPayload,
  frameContext?: { frameId?: number; isSubframe?: boolean },
): ApiCallRecord {
  const record: ApiCallRecord = existing ?? {
    id: data.id,
    sessionId: data.sessionId || data.id,
    api: data.api,
    method: data.method,
    origin: data.origin,
    timestamp: data.timestamp,
    timestamps: {},
  };

  if (!record.origin && data.origin) {
    record.origin = data.origin;
  }

  if (frameContext?.frameId !== undefined) {
    record.frameId = frameContext.frameId;
  } else if (data.frameId !== undefined) {
    record.frameId = data.frameId;
  }

  if (frameContext?.isSubframe !== undefined) {
    record.isSubframe = frameContext.isSubframe;
  } else if (data.isSubframe !== undefined) {
    record.isSubframe = data.isSubframe;
  }

  if (data.stage) {
    record.timestamps[data.stage] = data.timestamp;
    if (
      (data.stage === ApiCallStage.CREATE || data.stage === ApiCallStage.EXECUTE) &&
      data.timestamp < record.timestamp
    ) {
      record.timestamp = data.timestamp;
    }
  }

  const mediaFlags = {
    hasMedia: Boolean(record.hasMedia),
    hasAudio: Boolean(record.hasAudio),
    hasImage: Boolean(record.hasImage),
  };

  if (data.errorMessage !== undefined) record.errorMessage = data.errorMessage;
  if (data.options !== undefined) {
    record.options = cloneWithoutDataUrls(data.options, mediaFlags);
  }
  if (data.args !== undefined) {
    record.args = cloneWithoutDataUrls(data.args, mediaFlags);
  }
  if (data.response !== undefined) {
    record.response = cloneWithoutDataUrls(data.response, mediaFlags);
  }
  if (data.inputTokenCount !== undefined) record.inputTokenCount = data.inputTokenCount;
  if (data.inputLength !== undefined) record.inputLength = data.inputLength;

  if (mediaFlags.hasMedia) record.hasMedia = true;
  if (mediaFlags.hasAudio) record.hasAudio = true;
  if (mediaFlags.hasImage) record.hasImage = true;

  record.stage = resolveRecordStage(record, data.stage);
  return record;
}
