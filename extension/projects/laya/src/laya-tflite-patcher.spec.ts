import { describe, expect, it } from 'vitest';
import { LayaTflitePatcher } from './laya-tflite-patcher';

/**
 * Builds a minimal valid TFLite FlatBuffer with the Laya subgraph topology:
 * - T0: input `attention_mask` [1, W] (float32)
 * - T1: input `qtype_onehot` [1, 3] (float32)
 * - T2: qtype projection output [1, 8] (float32)
 * - T3: reshape shape const [1, 1, 1, W] (int32, buffer 1)
 * - T4, T5, T6: 4D mask chain [1, 1, 1, W] (float32)
 * - T7: 4D constant mask [1, 1, W, W] (float32, buffer 2)
 * - T8: 4D constant RoPE [1, 1, W, D] (float32, buffer 3)
 */
function buildSyntheticLayaFlatBuffer(W: number, D: number): Uint8Array {
  const bytes = new Uint8Array(4096);
  const dv = new DataView(bytes.buffer);
  let cursor = 64;

  const align4 = () => {
    cursor = (cursor + 3) & ~3;
  };

  const writeInt32Vec = (vals: number[]): number => {
    align4();
    const pos = cursor;
    dv.setInt32(pos, vals.length, true);
    for (let i = 0; i < vals.length; i++) {
      dv.setInt32(pos + 4 + i * 4, vals[i], true);
    }
    cursor += 4 + vals.length * 4;
    return pos;
  };

  const writeFloat32Vec = (vals: Float32Array): number => {
    align4();
    const pos = cursor;
    dv.setInt32(pos, vals.byteLength, true);
    new Uint8Array(bytes.buffer, pos + 4, vals.byteLength).set(
      new Uint8Array(vals.buffer, vals.byteOffset, vals.byteLength),
    );
    cursor += 4 + vals.byteLength;
    return pos;
  };

  const writeTable = (fields: Array<{ idx: number; kind: 'ref' | 'u32' | 'i8'; val: number }>): number => {
    align4();
    const maxIdx = fields.reduce((m, f) => Math.max(m, f.idx), -1);
    const vtableSize = 4 + (maxIdx + 1) * 2;
    const vtablePos = cursor;
    const objSize = 4 + fields.length * 4;
    dv.setUint16(vtablePos, vtableSize, true);
    dv.setUint16(vtablePos + 2, objSize, true);
    cursor += vtableSize;
    align4();
    const tablePos = cursor;
    dv.setInt32(tablePos, tablePos - vtablePos, true);
    let fieldOff = 4;
    for (const f of fields) {
      dv.setUint16(vtablePos + 4 + f.idx * 2, fieldOff, true);
      const absOff = tablePos + fieldOff;
      if (f.kind === 'ref') {
        dv.setInt32(absOff, f.val - absOff, true);
      } else if (f.kind === 'u32') {
        dv.setUint32(absOff, f.val, true);
      } else {
        dv.setInt8(absOff, f.val);
      }
      fieldOff += 4;
    }
    cursor += objSize;
    return tablePos;
  };

  const writeRefVec = (targets: number[]): number => {
    align4();
    const pos = cursor;
    dv.setInt32(pos, targets.length, true);
    for (let i = 0; i < targets.length; i++) {
      const slot = pos + 4 + i * 4;
      dv.setInt32(slot, targets[i] - slot, true);
    }
    cursor += 4 + targets.length * 4;
    return pos;
  };

  // Buffers:
  // 0: empty
  // 1: int32 [1, 1, 1, W]
  // 2: float32 [W * W]
  // 3: float32 [W * D]
  const buf0 = writeTable([]);
  const shapeData = writeInt32Vec([1, 1, 1, W]);
  // Note: writeInt32Vec wrote element count (4), whereas TFLite Buffer.data is a uint8 vector (byte length = 16)
  dv.setInt32(shapeData, 16, true);
  const buf1 = writeTable([{ idx: 0, kind: 'ref', val: shapeData }]);

  const maskDataArr = new Float32Array(W * W);
  for (let i = 0; i < W * W; i++) maskDataArr[i] = i + 1;
  const maskData = writeFloat32Vec(maskDataArr);
  const buf2 = writeTable([{ idx: 0, kind: 'ref', val: maskData }]);

  const ropeDataArr = new Float32Array(W * D);
  for (let i = 0; i < W * D; i++) ropeDataArr[i] = (i + 1) * 10;
  const ropeData = writeFloat32Vec(ropeDataArr);
  const buf3 = writeTable([{ idx: 0, kind: 'ref', val: ropeData }]);

  const makeTensor = (shape: number[], type: number, buffer: number) => {
    const sVec = writeInt32Vec(shape);
    return writeTable([
      { idx: 0, kind: 'ref', val: sVec },
      { idx: 1, kind: 'i8', val: type },
      { idx: 2, kind: 'u32', val: buffer },
    ]);
  };

  const t0 = makeTensor([1, W], 0, 0);
  const t1 = makeTensor([1, 3], 0, 0);
  const t2 = makeTensor([1, 8], 0, 0);
  const t3 = makeTensor([4], 2, 1);
  const t4 = makeTensor([1, 1, 1, W], 0, 0);
  const t5 = makeTensor([1, 1, 1, W], 0, 0);
  const t6 = makeTensor([1, 1, 1, W], 0, 0);
  const t7 = makeTensor([1, 1, W, W], 0, 2);
  const t8 = makeTensor([1, 1, W, D], 0, 3);

  const makeOp = (ins: number[], outs: number[]) => {
    const inVec = writeInt32Vec(ins);
    const outVec = writeInt32Vec(outs);
    return writeTable([
      { idx: 1, kind: 'ref', val: inVec },
      { idx: 2, kind: 'ref', val: outVec },
    ]);
  };

  const opQtype = makeOp([1], [2]);
  const opReshape = makeOp([0, 3], [4]);
  const opSub = makeOp([4], [5]);
  const opMul = makeOp([5], [6]);

  const tensorsVec = writeRefVec([t0, t1, t2, t3, t4, t5, t6, t7, t8]);
  const inputsVec = writeInt32Vec([0, 1]);
  const opsVec = writeRefVec([opQtype, opReshape, opSub, opMul]);

  const sg = writeTable([
    { idx: 0, kind: 'ref', val: tensorsVec },
    { idx: 1, kind: 'ref', val: inputsVec },
    { idx: 3, kind: 'ref', val: opsVec },
  ]);
  const sgVec = writeRefVec([sg]);
  const bufVec = writeRefVec([buf0, buf1, buf2, buf3]);

  const root = writeTable([
    { idx: 2, kind: 'ref', val: sgVec },
    { idx: 4, kind: 'ref', val: bufVec },
  ]);
  dv.setInt32(0, root, true);
  return bytes.subarray(0, cursor);
}

describe('LayaTflitePatcher', () => {
  it('returns null for short or invalid buffers', () => {
    expect(LayaTflitePatcher.tryCreate(new Uint8Array(16), 256)).toBeNull();
    expect(LayaTflitePatcher.tryCreate(new Uint8Array(256), 256)).toBeNull();
  });

  it('patches single-slot, multi-slot, and restores bit-for-bit to original', () => {
    const orig = buildSyntheticLayaFlatBuffer(8, 2);
    const snapshot = orig.slice();

    const patcher = LayaTflitePatcher.tryCreate(orig, 8);
    expect(patcher).not.toBeNull();
    expect(patcher!.supportsMultiSlot).toBe(true);

    // Patch single-slot [4]
    patcher!.patchSlots([4]);
    expect(orig).not.toEqual(snapshot);

    // Patch multi-slot [2, 2]
    patcher!.patchSlots([2, 2]);
    expect(orig).not.toEqual(snapshot);

    // Restore back to [8] and verify bit-exact match with initial buffer
    patcher!.restore();
    expect(Array.from(orig)).toEqual(Array.from(snapshot));

    // Re-creating a patcher after restore must succeed as well (e.g. WebGPU -> WASM fallback)
    const patcher2 = LayaTflitePatcher.tryCreate(orig, 8);
    expect(patcher2).not.toBeNull();
    expect(patcher2!.supportsMultiSlot).toBe(true);
  });

  it('rejects invalid slot sizes', () => {
    const orig = buildSyntheticLayaFlatBuffer(8, 2);
    const patcher = LayaTflitePatcher.tryCreate(orig, 8)!;
    expect(() => patcher.patchSlots([])).toThrow();
    expect(() => patcher.patchSlots([0])).toThrow();
    expect(() => patcher.patchSlots([-2, 6])).toThrow();
    expect(() => patcher.patchSlots([9])).toThrow();
  });
});
