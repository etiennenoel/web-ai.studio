import { float16BitsToNumber } from './laya-float16.utils';

/**
 * Host-side token embedding table for the `inputs_embeds` graph variants.
 * Holds the row-major little-endian float16 table and gathers rows as float32.
 */
export class LayaEmbeddingTable {
  private readonly data: Uint16Array;
  private readonly lookup: Float32Array;

  constructor(
    buffer: ArrayBuffer,
    readonly rows: number,
    readonly dim: number,
  ) {
    if (buffer.byteLength !== rows * dim * 2) {
      throw new Error(
        `LayaEmbeddingTable: expected ${rows * dim * 2} bytes for [${rows},${dim}] float16, got ${buffer.byteLength}`,
      );
    }
    this.data = new Uint16Array(buffer);
    this.lookup = new Float32Array(65536);
    for (let bits = 0; bits < 65536; bits++) this.lookup[bits] = float16BitsToNumber(bits);
  }

  /**
   * Gathers one row per position. Positions past `ids.length` use the pad row,
   * as the host contract requires ("a padded position uses the actual PAD row").
   */
  gather(ids: number[], length: number, padId: number): Float32Array {
    const out = new Float32Array(length * this.dim);
    for (let pos = 0; pos < length; pos++) {
      const id = pos < ids.length ? ids[pos] : padId;
      const src = id * this.dim;
      const dst = pos * this.dim;
      for (let j = 0; j < this.dim; j++) out[dst + j] = this.lookup[this.data[src + j]];
    }
    return out;
  }
}
