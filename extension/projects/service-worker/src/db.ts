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

  async saveCall(data: any): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const getReq = store.get(data.id);
      
      getReq.onsuccess = () => {
        let record = getReq.result;
        if (!record) {
          record = {
            id: data.id,
            sessionId: data.sessionId || data.id,
            api: data.api,
            method: data.method,
            origin: data.origin,
            timestamp: data.timestamp, // Base timestamp for indexing
            timestamps: {}
          };
        }
        
        if (data.stage) {
          record.timestamps[data.stage] = data.timestamp;
        }
        
        if (data.errorMessage !== undefined) record.errorMessage = data.errorMessage;
        if (data.options !== undefined) record.options = data.options;
        if (data.args !== undefined) record.args = data.args;
        if (data.response !== undefined) record.response = data.response;

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = (event: Event) => reject((event.target as IDBRequest).error);
      };
      
      getReq.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async getAllHistory(): Promise<any[]> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async getHistory(origin: string, apiName?: string): Promise<any[]> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('origin');
      const request = index.getAll(IDBKeyRange.only(origin));

      request.onsuccess = () => {
        const results = request.result || [];
        // Filter by API name if provided and not 'all', and sort by timestamp descending
        let filtered = results;
        if (apiName && apiName !== 'all') {
          filtered = results.filter(item => item.api === apiName);
        }
        filtered.sort((a, b) => b.timestamp - a.timestamp);
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
        keys.forEach(key => store.delete(key));
        resolve();
      };
      
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
        const results = request.result || [];
        const toDelete = results.filter((item: any) => item.sessionId === sessionId);
        toDelete.forEach((item: any) => store.delete(item.id));
        resolve();
      };
      
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async getSetting(key: string, defaultValue: any): Promise<any> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.settingsStoreName], 'readonly');
      const store = transaction.objectStore(this.settingsStoreName);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result !== undefined) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.settingsStoreName], 'readwrite');
      const store = transaction.objectStore(this.settingsStoreName);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
  }
}

export const db = new WebAIDatabase();
