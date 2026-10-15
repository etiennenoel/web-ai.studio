import { describe, expect, it } from 'vitest';
import { LayaTflitePatcher } from './laya-tflite-patcher';

describe('LayaTflitePatcher', () => {
  it('returns null for short or invalid buffers', () => {
    expect(LayaTflitePatcher.tryCreate(new Uint8Array(16), 256)).toBeNull();
    expect(LayaTflitePatcher.tryCreate(new Uint8Array(256), 256)).toBeNull();
  });
});
