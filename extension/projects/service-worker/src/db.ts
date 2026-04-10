import { ApiCallPayload } from '../../shared/interfaces/api-call-payload.interface';
import { ApiCallRecord, SettingRecord } from '../../shared/interfaces/api-call-record.interface';

/**
 * Manages IndexedDB storage for the Web AI extension.
 *
 * Two object stores:
 * - `api_calls`: Stores ApiCallRecord entries, one per unique method invocation.
 *    Multiple ApiCallPayload events (one per lifecycle stage) are merged into a
 *    single record keyed by the call's id.
 * - `settings`: Simple key/value store for user preferences (e.g., wrap_api toggle).
 */
export class WebAIDatabase {
  private dbName = 'WebAI_Extension_DB';
  private dbVersion = 2;
  private storeName = 'api_calls';
  private settingsStoreName = 'settings';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('origin', 'origin', { unique: false });
          store.createIndex('api', 'api', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(this.settingsStoreName)) {
          db.createObjectStore(this.settingsStoreName, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error('IndexedDB error:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /**
   * Persists an API call lifecycle event.
   *
   * Each stage (create, execute, first_token, completed, error, input_usage)
   * arrives as a separate payload. This method merges them into a single
   * ApiCallRecord using the payload's id as the key. If the record doesn't
   * exist yet, a new one is created; otherwise the existing record is updated
   * with the stage timestamp and any new fields.
   */
  async saveCall(data: ApiCallPayload): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const getReq = store.get(data.id);

      getReq.onsuccess = () => {
        let record: ApiCallRecord = getReq.result;
        if (!record) {
          record = {
            id: data.id,
            sessionId: data.sessionId || data.id,
            api: data.api,
            method: data.method,
            origin: data.origin,
            timestamp: data.timestamp,
            timestamps: {},
          };
        }

        if (data.stage) {
          record.timestamps[data.stage] = data.timestamp;
        }

        if (data.errorMessage !== undefined) record.errorMessage = data.errorMessage;
        if (data.options !== undefined) record.options = data.options;
        if (data.args !== undefined) record.args = data.args;
        if (data.response !== undefined) record.response = data.response;
        if (data.inputTokenCount !== undefined) record.inputTokenCount = data.inputTokenCount;
        if (data.inputLength !== undefined) record.inputLength = data.inputLength;

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = (event: Event) => reject((event.target as IDBRequest).error);
      };

      getReq.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async getHistoryItem(id: string): Promise<ApiCallRecord | undefined> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  /**
   * Recursively removes dataUrl fields from serialized Blob objects.
   *
   * The injected script serializes Blobs (images, audio) as objects with a
   * `__type: 'Blob'` marker and a `dataUrl` field. We strip the dataUrl before
   * returning records to the UI to avoid sending multi-MB base64 strings over
   * the message channel. Instead we set `hasMedia`, `hasAudio`, and `hasImage`
   * flags so the UI can show appropriate indicators.
   */
  private stripDataUrls(
    obj: Record<string, unknown>,
    parentInfo: { hasAudio: boolean; hasImage: boolean },
    depth = 0,
  ): boolean {
    if (!obj || typeof obj !== 'object' || depth > 10) return false;
    let foundMedia = false;

    const blobObj = obj as { __type?: string; dataUrl?: string; type?: string; hasMedia?: boolean };
    if (blobObj.__type === 'Blob' && blobObj.dataUrl) {
      blobObj.hasMedia = true;
      if (
        blobObj.type?.startsWith('audio/') ||
        blobObj.dataUrl.startsWith('data:audio/') ||
        blobObj.dataUrl.includes('audio')
      ) {
        parentInfo.hasAudio = true;
      } else {
        parentInfo.hasImage = true;
      }
      delete blobObj.dataUrl;
      return true;
    }

    for (const key of Object.keys(obj)) {
      const child = obj[key];
      if (child && typeof child === 'object' && this.stripDataUrls(child as Record<string, unknown>, parentInfo, depth + 1)) {
        foundMedia = true;
      }
    }
    return foundMedia;
  }

  /**
   * Annotates a record with media flags after stripping embedded dataUrls.
   * Mutates the record in place.
   */
  private annotateMediaFlags(record: ApiCallRecord): void {
    let hasMedia = false;
    const info = { hasAudio: false, hasImage: false };

    if (record.args && this.stripDataUrls(record.args as Record<string, unknown>, info)) hasMedia = true;
    if (record.options && this.stripDataUrls(record.options as Record<string, unknown>, info)) hasMedia = true;

    record.hasMedia = hasMedia;
    record.hasAudio = info.hasAudio;
    record.hasImage = info.hasImage;
  }

  async getAllHistory(): Promise<ApiCallRecord[]> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: ApiCallRecord[] = request.result || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        results.forEach((item) => this.annotateMediaFlags(item));
        resolve(results);
      };

      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async getHistory(origin: string, apiName?: string): Promise<ApiCallRecord[]> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('origin');
      const request = index.getAll(IDBKeyRange.only(origin));

      request.onsuccess = () => {
        const results: ApiCallRecord[] = request.result || [];
        let filtered = results;
        if (apiName && apiName !== 'all') {
          filtered = results.filter((item) => item.api === apiName);
        }
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        filtered.forEach((item) => this.annotateMediaFlags(item));
        resolve(filtered);
      };

      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async clearHistory(origin: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('origin');
      const request = index.getAllKeys(IDBKeyRange.only(origin));

      request.onsuccess = () => {
        const keys = request.result || [];
        keys.forEach((key) => store.delete(key));
        resolve();
      };

      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async clearAllHistory(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async deleteSession(origin: string, sessionId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('origin');
      const request = index.getAll(IDBKeyRange.only(origin));

      request.onsuccess = () => {
        const results: ApiCallRecord[] = request.result || [];
        const toDelete = results.filter((item) => item.sessionId === sessionId);
        toDelete.forEach((item) => store.delete(item.id));
        resolve();
      };

      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async getSetting<T = unknown>(key: string, defaultValue: T): Promise<T> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.settingsStoreName], 'readonly');
      const store = transaction.objectStore(this.settingsStoreName);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as SettingRecord | undefined;
        if (record !== undefined) {
          resolve(record.value as T);
        } else {
          resolve(defaultValue);
        }
      };

      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.settingsStoreName], 'readwrite');
      const store = transaction.objectStore(this.settingsStoreName);
      const record: SettingRecord = { key, value };
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }
}

export const db = new WebAIDatabase();
