import { float16BitsToNumber } from './laya-float16.utils';

const MAX_CACHED_ROWS = 4096;

/**
 * Host-side token embedding table for the `inputs_embeds` graph variants.
 * Holds the row-major little-endian float16 table and gathers rows as float32,
 * caching decoded float32 rows for hot token IDs (head tokens, special tokens, pad).
 */
export class LayaEmbeddingTable {
  private readonly data: Uint16Array;
  private readonly lookup: Float32Array;
  private readonly rowCache = new Map<number, Float32Array>();

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
   * Gathers one row per position into a new `Float32Array`. Positions past
   * `ids.length` use the pad row, as the host contract requires ("a padded
   * position uses the actual PAD row").
   */
  gather(ids: number[], length: number, padId: number): Float32Array {
    const out = new Float32Array(length * this.dim);
    this.gatherInto(ids, length, padId, out, 0);
    return out;
  }

  /**
   * Gathers `length` rows into `out` starting at float offset `dstOffset`.
   */
  gatherInto(ids: number[], length: number, padId: number, out: Float32Array, dstOffset = 0): void {
    const dim = this.dim;
    const idsLen = ids.length;
    for (let pos = 0; pos < length; pos++) {
      const id = pos < idsLen ? ids[pos] : padId;
      out.set(this.getRow(id), dstOffset + pos * dim);
    }
  }

  private getRow(id: number): Float32Array {
    let row = this.rowCache.get(id);
    if (row) {
      this.rowCache.delete(id);
      this.rowCache.set(id, row);
      return row;
    }
    if (id < 0 || id >= this.rows) {
      throw new RangeError(`LayaEmbeddingTable: token id ${id} out of range [0, ${this.rows})`);
    }

    const dim = this.dim;
    row = new Float32Array(dim);
    const src = id * dim;
    const data = this.data;
    const lookup = this.lookup;
    for (let j = 0; j < dim; j++) {
      row[j] = lookup[data[src + j]];
    }
    if (this.rowCache.size >= MAX_CACHED_ROWS) {
      const oldest = this.rowCache.keys().next().value;
      if (oldest !== undefined) this.rowCache.delete(oldest);
    }
    this.rowCache.set(id, row);
    return row;
  }
}
