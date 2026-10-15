import { describe, expect, it } from 'vitest';
import { LayaEmbeddingTable } from './laya-embedding-table';

function f32ToF16Bits(val: number): number {
  const f32 = new Float32Array([val]);
  const u32 = new Uint32Array(f32.buffer)[0];
  const sign = (u32 >>> 16) & 0x8000;
  const exp = ((u32 >>> 23) & 0xff) - 127 + 15;
  const mant = (u32 >>> 13) & 0x03ff;
  if (exp <= 0) return sign;
  if (exp >= 31) return sign | 0x7c00;
  return sign | (exp << 10) | mant;
}

describe('LayaEmbeddingTable', () => {
  it('gathers and caches rows into a pre-allocated buffer at an offset', () => {
    const rows = 4;
    const cols = 3;
    const raw = new Uint16Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        raw[r * cols + c] = f32ToF16Bits((r + 1) * 10 + c);
      }
    }

    const table = new LayaEmbeddingTable(raw.buffer, rows, cols);
    const direct = table.gather([1, 3], 4, 0);
    expect(Array.from(direct)).toEqual([
      20, 21, 22,
      40, 41, 42,
      10, 11, 12,
      10, 11, 12,
    ]);

    const packed = new Float32Array(2 * 2 * cols);
    table.gatherInto([2], 2, 0, packed, 0);
    table.gatherInto([1, 3], 2, 0, packed, 2 * cols);
    expect(Array.from(packed)).toEqual([
      30, 31, 32,
      10, 11, 12,
      20, 21, 22,
      40, 41, 42,
    ]);
  });
});
