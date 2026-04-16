import { describe, it, expect } from 'vitest';
import { PostMessageSanitizer } from './post-message-sanitizer';

describe('PostMessageSanitizer', () => {
  it('should pass through primitives unchanged', async () => {
    expect(await PostMessageSanitizer.sanitize(42)).toBe(42);
    expect(await PostMessageSanitizer.sanitize('hello')).toBe('hello');
    expect(await PostMessageSanitizer.sanitize(true)).toBe(true);
    expect(await PostMessageSanitizer.sanitize(null)).toBe(null);
    expect(await PostMessageSanitizer.sanitize(undefined)).toBe(undefined);
  });

  it('should strip functions and symbols', async () => {
    expect(await PostMessageSanitizer.sanitize(() => {})).toBe(undefined);
    expect(await PostMessageSanitizer.sanitize(Symbol('test'))).toBe(undefined);
  });

  it('should sanitize plain objects recursively', async () => {
    const input = { a: 1, b: 'two', c: { d: true } };
    const result = await PostMessageSanitizer.sanitize(input);
    expect(result).toEqual({ a: 1, b: 'two', c: { d: true } });
  });

  it('should strip function-valued properties from objects', async () => {
    const input = { name: 'test', doSomething: () => {}, count: 3 };
    const result = await PostMessageSanitizer.sanitize(input) as Record<string, unknown>;
    expect(result).toHaveProperty('name', 'test');
    expect(result).toHaveProperty('count', 3);
    expect(result).not.toHaveProperty('doSomething');
  });

  it('should sanitize arrays recursively', async () => {
    const input = [1, 'two', { x: 3 }, null, undefined];
    const result = await PostMessageSanitizer.sanitize(input);
    expect(result).toEqual([1, 'two', { x: 3 }, null, undefined]);
  });

  it('should respect maxDepth and return undefined at the limit', async () => {
    const deepObj = { a: { b: { c: { d: 'deep' } } } };
    const result = await PostMessageSanitizer.sanitize(deepObj, 2) as any;
    // At depth 2, we've exhausted the budget: a (depth 1) -> b (depth 0) -> c hits -1
    expect(result.a.b.c).toBe(undefined);
  });

  it('should handle ArrayBuffer by returning byte length marker', async () => {
    const buffer = new ArrayBuffer(16);
    const result = await PostMessageSanitizer.sanitize(buffer);
    expect(result).toEqual({ __type: 'BufferData', byteLength: 16 });
  });

  it('should handle TypedArray by returning byte length marker', async () => {
    const arr = new Uint8Array(8);
    const result = await PostMessageSanitizer.sanitize(arr);
    expect(result).toEqual({ __type: 'BufferData', byteLength: 8 });
  });

  it('should handle Blob by converting to a data URL', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const result = await PostMessageSanitizer.sanitize(blob) as any;
    expect(result.__type).toBe('Blob');
    expect(result.type).toBe('text/plain');
    expect(result.size).toBe(5);
    expect(result.dataUrl).toMatch(/^data:text\/plain;base64,/);
  });

  it('should handle objects with toJSON()', async () => {
    const obj = {
      toJSON() {
        return { serialized: true };
      },
    };
    const result = await PostMessageSanitizer.sanitize(obj);
    expect(result).toEqual({ serialized: true });
  });

  it('should handle empty objects', async () => {
    const result = await PostMessageSanitizer.sanitize({});
    // Empty object with no props - toString fallback or empty object
    expect(result).toBeDefined();
  });
});
