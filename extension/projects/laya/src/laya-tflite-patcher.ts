/**
 * In-place TFLite FlatBuffer specialization for Laya encoder graphs.
 *
 * Specializes the static sequence window `origWindow` (e.g. 256 or 512) to:
 * - A shorter single-sequence bucket `[M]` (`M <= origWindow`), reducing WebGPU /
 *   XNNPACK compute and memory traffic while preserving bit-exact marker logits.
 * - A multi-question packed slot layout `[S_0, S_1, ..., S_{B-1}]` (`sum = M <= origWindow`)
 *   with block-diagonal 2D attention masking, per-slot RoPE tables, and per-token
 *   question-type embeddings so `B` questions execute in a single forward pass.
 */
export class LayaTflitePatcher {
  private constructor(
    private readonly bytes: Uint8Array,
    private readonly dv: DataView,
    readonly origWindow: number,
    private readonly windowInt32Offsets: readonly number[],
    private readonly maskBuffers: ReadonlyArray<{
      ptr: number;
      sizeOff: number;
      dataOff: number;
      saved: Float32Array;
    }>,
    private readonly ropeBuffers: ReadonlyArray<{
      ptr: number;
      dim: number;
      sizeOff: number;
      dataOff: number;
      saved: Float32Array;
    }>,
    private readonly attnMaskShapeVp: number,
    private readonly qtypeDim0Offset: number,
    private readonly qtypeProjDim0Offset: number,
    private readonly reshape152Ptr: number,
    private readonly mask4dDim2Offsets: readonly number[],
  ) {}

  get supportsMultiSlot(): boolean {
    return (
      this.attnMaskShapeVp !== 0 &&
      this.qtypeDim0Offset !== 0 &&
      this.qtypeProjDim0Offset !== 0 &&
      this.reshape152Ptr !== 0 &&
      this.mask4dDim2Offsets.length === 3
    );
  }

  static tryCreate(bytes: Uint8Array, origWindow: number): LayaTflitePatcher | null {
    if (bytes.byteLength < 64) return null;
    try {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const readTable = (pos: number) => {
        const vtablePos = pos - dv.getInt32(pos, true);
        const vtableSize = dv.getUint16(vtablePos, true);
        return {
          fieldOffset(idx: number): number {
            const off = 4 + idx * 2;
            if (off >= vtableSize) return 0;
            const f = dv.getUint16(vtablePos + off, true);
            return f === 0 ? 0 : pos + f;
          },
        };
      };
      const readIndirect = (off: number): number => off + dv.getInt32(off, true);
      const readInt32Vec = (off: number): number[] => {
        if (!off) return [];
        const vp = readIndirect(off);
        const len = dv.getInt32(vp, true);
        const out: number[] = [];
        for (let i = 0; i < len; i++) out.push(dv.getInt32(vp + 4 + i * 4, true));
        return out;
      };

      const rootPos = dv.getInt32(0, true);
      if (rootPos <= 0 || rootPos >= bytes.byteLength) return null;
      const root = readTable(rootPos);
      const sgField = root.fieldOffset(2);
      const bufField = root.fieldOffset(4);
      if (!sgField || !bufField) return null;

      const sgVec = readIndirect(sgField);
      const bufVec = readIndirect(bufField);
      if (dv.getInt32(sgVec, true) < 1) return null;

      const sg = readTable(readIndirect(sgVec + 4));
      const tField = sg.fieldOffset(0);
      const insField = sg.fieldOffset(1);
      const opsField = sg.fieldOffset(3);
      if (!tField || !insField || !opsField) return null;

      const tVec = readIndirect(tField);
      const numT = dv.getInt32(tVec, true);
      const sgInputs = new Set(readInt32Vec(insField));
      const opsVec = readIndirect(opsField);
      const numOps = dv.getInt32(opsVec, true);

      const windowInt32Offsets: number[] = [];
      const maskBuffers: Array<{ ptr: number; sizeOff: number; dataOff: number; saved: Float32Array }> = [];
      const ropeBuffers: Array<{ ptr: number; dim: number; sizeOff: number; dataOff: number; saved: Float32Array }> = [];

      let attnMaskTensorIdx = -1;
      let attnMaskShapeVp = 0;
      let qtypeTensorIdx = -1;
      let qtypeDim0Offset = 0;
      const tensorShapeVp = new Map<number, { vp: number; shape: number[] }>();
      const tensorBufferPtr = new Map<number, { ptr: number; count: number; type: number }>();

      for (let i = 0; i < numT; i++) {
        const t = readTable(readIndirect(tVec + 4 + i * 4));
        const shapeOff = t.fieldOffset(0);
        const origShape: number[] = [];
        let shapeVp = 0;
        if (shapeOff) {
          shapeVp = readIndirect(shapeOff);
          const len = dv.getInt32(shapeVp, true);
          for (let k = 0; k < len; k++) {
            const d = dv.getInt32(shapeVp + 4 + k * 4, true);
            origShape.push(d);
            if (d === origWindow) windowInt32Offsets.push(shapeVp + 4 + k * 4);
          }
          tensorShapeVp.set(i, { vp: shapeVp, shape: origShape });
        }
        const sigOff = t.fieldOffset(7);
        if (sigOff) {
          const vp = readIndirect(sigOff);
          const len = dv.getInt32(vp, true);
          for (let k = 0; k < len; k++) {
            const d = dv.getInt32(vp + 4 + k * 4, true);
            if (d === origWindow) windowInt32Offsets.push(vp + 4 + k * 4);
          }
        }

        const typeOff = t.fieldOffset(1);
        const type = typeOff ? dv.getInt8(typeOff) : 0;

        if (sgInputs.has(i) && type === 0 && origShape.length === 2) {
          if (origShape[0] === 1 && origShape[1] === origWindow) {
            attnMaskTensorIdx = i;
            attnMaskShapeVp = shapeVp;
          } else if (origShape[0] === 1 && origShape[1] === 3) {
            qtypeTensorIdx = i;
            qtypeDim0Offset = shapeVp + 4;
          }
        }

        const bufOff = t.fieldOffset(2);
        const bufIdx = bufOff ? dv.getUint32(bufOff, true) : 0;
        if (!bufIdx) continue;
        const b = readTable(readIndirect(bufVec + 4 + bufIdx * 4));
        const dataOff = b.fieldOffset(0);
        const offsetOff = b.fieldOffset(1);
        const sizeOff = b.fieldOffset(2);
        const extOffset = offsetOff ? Number(dv.getBigUint64(offsetOff, true)) : 0;
        const extSize = sizeOff ? Number(dv.getBigUint64(sizeOff, true)) : 0;
        let dataPtr = 0;
        let dataLen = 0;
        if (dataOff) {
          const vp = readIndirect(dataOff);
          dataLen = dv.getInt32(vp, true);
          dataPtr = vp + 4;
        }
        const bytesLen = dataLen || extSize;
        const ptr = dataPtr || extOffset;
        if (bytesLen === 0 || ptr <= 0 || ptr + bytesLen > bytes.byteLength) continue;

        if (type === 2 && bytesLen <= 64) {
          const count = bytesLen / 4;
          tensorBufferPtr.set(i, { ptr, count, type });
          for (let k = 0; k < count; k++) {
            if (dv.getInt32(ptr + k * 4, true) === origWindow) {
              windowInt32Offsets.push(ptr + k * 4);
            }
          }
        } else if (type === 0 && origShape.includes(origWindow)) {
          if (origShape.length === 4 && origShape[2] === origWindow && origShape[3] === origWindow) {
            const saved = new Float32Array(
              bytes.buffer.slice(bytes.byteOffset + ptr, bytes.byteOffset + ptr + origWindow * origWindow * 4),
            );
            maskBuffers.push({ ptr, sizeOff, dataOff: dataOff ? readIndirect(dataOff) : 0, saved });
          } else if (origShape.length === 4 && origShape[2] === origWindow) {
            const dim = origShape[3];
            const saved = new Float32Array(
              bytes.buffer.slice(bytes.byteOffset + ptr, bytes.byteOffset + ptr + origWindow * dim * 4),
            );
            ropeBuffers.push({ ptr, dim, sizeOff, dataOff: dataOff ? readIndirect(dataOff) : 0, saved });
          }
        }
      }

      if (windowInt32Offsets.length === 0 || maskBuffers.length === 0 || ropeBuffers.length === 0) {
        return null;
      }

      // Trace multi-slot attention mask and qtype projection tensors by operator topology.
      let qtypeProjDim0Offset = 0;
      let reshape152Ptr = 0;
      const mask4dDim2Offsets: number[] = [];

      const firstConsumerOf = new Map<number, { ins: number[]; outs: number[] }>();
      for (let i = 0; i < numOps; i++) {
        const op = readTable(readIndirect(opsVec + 4 + i * 4));
        const ins = readInt32Vec(op.fieldOffset(1));
        const outs = readInt32Vec(op.fieldOffset(2));
        for (const inp of ins) {
          if (inp >= 0 && !firstConsumerOf.has(inp)) {
            firstConsumerOf.set(inp, { ins, outs });
          }
        }
      }

      if (qtypeTensorIdx >= 0) {
        const qtypeOp = firstConsumerOf.get(qtypeTensorIdx);
        if (qtypeOp && qtypeOp.outs.length === 1) {
          const projShape = tensorShapeVp.get(qtypeOp.outs[0]);
          if (projShape && projShape.shape.length === 2 && projShape.shape[0] === 1) {
            qtypeProjDim0Offset = projShape.vp + 4;
          }
        }
      }

      if (attnMaskTensorIdx >= 0) {
        const reshapeOp = firstConsumerOf.get(attnMaskTensorIdx);
        if (reshapeOp && reshapeOp.ins.length === 2 && reshapeOp.outs.length === 1) {
          const shapeConst = tensorBufferPtr.get(reshapeOp.ins[1]);
          if (shapeConst && shapeConst.count === 4) {
            reshape152Ptr = shapeConst.ptr;
          }
          const t153 = reshapeOp.outs[0];
          const subOp = firstConsumerOf.get(t153);
          const t154 = subOp?.outs[0] ?? -1;
          const mulOp = t154 >= 0 ? firstConsumerOf.get(t154) : undefined;
          const t155 = mulOp?.outs[0] ?? -1;
          for (const tid of [t153, t154, t155]) {
            const info = tensorShapeVp.get(tid);
            if (info && info.shape.length === 4 && info.shape[2] === 1 && info.shape[3] === origWindow) {
              mask4dDim2Offsets.push(info.vp + 4 + 2 * 4);
            }
          }
        }
      }

      return new LayaTflitePatcher(
        bytes,
        dv,
        origWindow,
        windowInt32Offsets,
        maskBuffers,
        ropeBuffers,
        attnMaskShapeVp,
        qtypeDim0Offset,
        qtypeProjDim0Offset,
        reshape152Ptr,
        mask4dDim2Offsets,
      );
    } catch {
      return null;
    }
  }

  /**
   * Patches the FlatBuffer in-place for the given slot sizes `[S_0, S_1, ...]`.
   * - Single-slot (`slotSizes.length === 1`): 1D attention mask `[1, M]`, `qtype_onehot [1, 3]`.
   * - Multi-slot (`slotSizes.length > 1`): 2D block-diagonal attention mask `[M, M]`, `qtype_onehot [M, 3]`.
   */
  patchSlots(slotSizes: readonly number[]): void {
    const B = slotSizes.length;
    if (B > 1 && !this.supportsMultiSlot) {
      throw new Error('LayaTflitePatcher: multi-slot packing is not supported for this graph');
    }
    const M = slotSizes.reduce((acc, s) => acc + s, 0);
    if (M <= 0 || M > this.origWindow) {
      throw new Error(`LayaTflitePatcher: total slot length ${M} exceeds window ${this.origWindow}`);
    }

    const dv = this.dv;
    for (let i = 0; i < this.windowInt32Offsets.length; i++) {
      dv.setInt32(this.windowInt32Offsets[i], M, true);
    }

    if (this.supportsMultiSlot) {
      const multiDim = B > 1 ? M : 1;
      dv.setInt32(this.qtypeDim0Offset, multiDim, true);
      dv.setInt32(this.qtypeProjDim0Offset, multiDim, true);
      dv.setInt32(this.attnMaskShapeVp + 4, multiDim, true);
      dv.setInt32(this.attnMaskShapeVp + 8, M, true);
      dv.setInt32(this.reshape152Ptr + 8, multiDim, true);
      dv.setInt32(this.reshape152Ptr + 12, M, true);
      for (const off of this.mask4dDim2Offsets) {
        dv.setInt32(off, multiDim, true);
      }
    }

    for (const m of this.maskBuffers) {
      const f32 = new Float32Array(this.bytes.buffer, this.bytes.byteOffset + m.ptr, M * M);
      if (M === this.origWindow) {
        f32.set(m.saved);
      } else {
        for (let r = 0; r < M; r++) {
          f32.set(m.saved.subarray(r * this.origWindow, r * this.origWindow + M), r * M);
        }
      }
      if (m.sizeOff) dv.setBigUint64(m.sizeOff, BigInt(M * M * 4), true);
      if (m.dataOff) dv.setInt32(m.dataOff, M * M * 4, true);
    }

    for (const rb of this.ropeBuffers) {
      const f32 = new Float32Array(this.bytes.buffer, this.bytes.byteOffset + rb.ptr, M * rb.dim);
      let offset = 0;
      for (const S of slotSizes) {
        f32.set(rb.saved.subarray(0, S * rb.dim), offset * rb.dim);
        offset += S;
      }
      if (rb.sizeOff) dv.setBigUint64(rb.sizeOff, BigInt(M * rb.dim * 4), true);
      if (rb.dataOff) dv.setInt32(rb.dataOff, M * rb.dim * 4, true);
    }
  }
}
