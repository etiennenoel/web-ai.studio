import { ApiCallPayload } from '../../shared/interfaces/api-call-payload.interface';
import { ApiCallRecord } from '../../shared/interfaces/api-call-record.interface';
import {
  cloneWithoutDataUrls,
  mergePayloadIntoMemoryRecord,
  resolveRecordStage,
} from '../../shared/utils/api-call-record.utils';

const MAX_CALLS_PER_TAB = 500;

/**
 * In-memory store in the Service Worker that aggregates active-page Built-in AI
 * API calls per `tabId` across ALL frames (top-level document + embedded `<iframe>`s).
 *
 * All stored records have heavy base64 `dataUrl` blobs stripped so Side Panel
 * IPC messages stay fast and well below Chrome's 64 MiB message limit.
 */
export class TabSessionsStore {
  private readonly tabs = new Map<number, Map<string, ApiCallRecord>>();

  recordCall(tabId: number, payload: ApiCallPayload, frameId?: number): void {
    let tabCalls = this.tabs.get(tabId);
    if (!tabCalls) {
      tabCalls = new Map<string, ApiCallRecord>();
      this.tabs.set(tabId, tabCalls);
    }

    const existing = tabCalls.get(payload.id);
    const isSubframe = typeof frameId === 'number' ? frameId !== 0 : payload.isSubframe;
    const updated = mergePayloadIntoMemoryRecord(existing, payload, {
      frameId,
      isSubframe,
    });

    if (!existing && tabCalls.size >= MAX_CALLS_PER_TAB) {
      const oldestKey = tabCalls.keys().next().value;
      if (oldestKey !== undefined) {
        tabCalls.delete(oldestKey);
      }
    }

    tabCalls.set(payload.id, updated);
  }

  syncRecords(tabId: number, records: ApiCallRecord[], frameId?: number): void {
    if (!Array.isArray(records) || records.length === 0) return;

    let tabCalls = this.tabs.get(tabId);
    if (!tabCalls) {
      tabCalls = new Map<string, ApiCallRecord>();
      this.tabs.set(tabId, tabCalls);
    }

    const isSubframe = typeof frameId === 'number' ? frameId !== 0 : undefined;

    for (const incoming of records) {
      if (!incoming || typeof incoming.id !== 'string') continue;
      if (tabCalls.has(incoming.id)) continue;

      const mediaFlags = {
        hasMedia: Boolean(incoming.hasMedia),
        hasAudio: Boolean(incoming.hasAudio),
        hasImage: Boolean(incoming.hasImage),
      };

      const sanitized: ApiCallRecord = {
        ...incoming,
        timestamps: { ...(incoming.timestamps || {}) },
        options:
          incoming.options !== undefined
            ? cloneWithoutDataUrls(incoming.options, mediaFlags)
            : undefined,
        args:
          incoming.args !== undefined
            ? cloneWithoutDataUrls(incoming.args, mediaFlags)
            : undefined,
        response:
          incoming.response !== undefined
            ? cloneWithoutDataUrls(incoming.response, mediaFlags)
            : undefined,
        frameId: frameId ?? incoming.frameId,
        isSubframe: isSubframe ?? incoming.isSubframe,
      };
      if (mediaFlags.hasMedia) sanitized.hasMedia = true;
      if (mediaFlags.hasAudio) sanitized.hasAudio = true;
      if (mediaFlags.hasImage) sanitized.hasImage = true;
      sanitized.stage = resolveRecordStage(sanitized, incoming.stage);

      if (tabCalls.size >= MAX_CALLS_PER_TAB) {
        const oldestKey = tabCalls.keys().next().value;
        if (oldestKey !== undefined) {
          tabCalls.delete(oldestKey);
        }
      }
      tabCalls.set(sanitized.id, sanitized);
    }
  }

  getTabCalls(tabId: number): ApiCallRecord[] {
    const tabCalls = this.tabs.get(tabId);
    if (!tabCalls) return [];
    return Array.from(tabCalls.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  clearTab(tabId: number): void {
    this.tabs.delete(tabId);
  }

  clearFrame(tabId: number, frameId: number): void {
    const tabCalls = this.tabs.get(tabId);
    if (!tabCalls) return;
    for (const [id, record] of tabCalls.entries()) {
      if (record.frameId === frameId) {
        tabCalls.delete(id);
      }
    }
  }

  clearOrigin(origin: string): void {
    for (const tabCalls of this.tabs.values()) {
      for (const [id, record] of tabCalls.entries()) {
        if (record.origin === origin) {
          tabCalls.delete(id);
        }
      }
    }
  }

  deleteSession(origin: string, sessionId: string): void {
    for (const tabCalls of this.tabs.values()) {
      for (const [id, record] of tabCalls.entries()) {
        if (record.origin === origin && record.sessionId === sessionId) {
          tabCalls.delete(id);
        }
      }
    }
  }

  clearAll(): void {
    this.tabs.clear();
  }
}

export const tabSessionsStore = new TabSessionsStore();
