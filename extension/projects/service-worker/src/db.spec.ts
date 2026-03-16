import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from './db';

describe('WebAIDatabase', () => {
  beforeEach(() => {
    // Basic mock of indexedDB if needed, but vitest + jsdom sometimes has it.
    if (!global.indexedDB) {
      console.log('No indexedDB in global, mocking it...');
      global.indexedDB = {
        open: vi.fn().mockReturnValue({
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          result: {
            objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
            transaction: vi.fn().mockReturnValue({
              objectStore: vi.fn().mockReturnValue({
                get: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
                put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
                getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
              })
            })
          }
        })
      } as any;
    }
  });

  it('should initialize db', () => {
    expect(db).toBeDefined();
    expect(typeof db.init).toBe('function');
    expect(typeof db.saveCall).toBe('function');
  });
});
