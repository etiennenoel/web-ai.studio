import { CompiledModel, Tensor, getGlobalLiteRt, loadAndCompile } from '@litertjs/core';
import { LayaModelRunnerOptions } from './laya-model-runner-options.interface';
import { LayaGraphInputMode } from './laya-graph-input-mode.enum';
import { LayaMainOutput } from './laya-main-output.interface';
import { LayaTflitePatcher } from './laya-tflite-patcher';

declare const GPUBufferUsage:
  | {
      readonly MAP_READ: number;
      readonly STORAGE: number;
      readonly COPY_DST: number;
      readonly COPY_SRC: number;
    }
  | undefined;

declare const GPUMapMode:
  | {
      readonly READ: number;
    }
  | undefined;

const MAX_COMPILED_BUCKETS = 1;
const SINGLE_BUCKETS = [48, 64, 80, 96, 128, 160, 192, 256, 512] as const;

interface CompiledBucket {
  readonly key: string;
  readonly slotSizes: readonly number[];
  readonly totalLen: number;
  readonly compiled: CompiledModel;
  readonly maskBuf: Float32Array;
  readonly qtypeBuf: Float32Array;
  readonly embedsBuf?: Float32Array;
  readonly inputIdsBuf?: Int32Array;
  readonly gpuDevice?: any;
  readonly gpuEmbedsBuf?: any;
  readonly gpuMaskBuf?: any;
  readonly gpuQtypeBuf?: any;
  readonly gpuReadbackBuf?: any;
  readonly gpuEmbedsTensor?: Tensor;
  readonly gpuMaskTensor?: Tensor;
  readonly gpuQtypeTensor?: Tensor;
  readonly liteRtCompiledModel?: any;
  readonly liteRtWasm?: any;
  readonly signatureIndex?: number;
  readonly gpuInputTensorBuffers?: any[];
  readonly tokenLogitsOutputIndex?: number;
}

/**
 * Runs the Laya main graph and act head with LiteRT.js.
 * `loadLiteRt()` must have completed before `load()` is called.
 */
export class LayaModelRunner {
  private readonly buckets = new Map<string, CompiledBucket>();

  private constructor(
    private readonly mainBytes: Uint8Array,
    private readonly patcher: LayaTflitePatcher | null,
    private readonly act: CompiledModel,
    private readonly options: LayaModelRunnerOptions,
  ) {}

  static async load(
    mainBytes: Uint8Array,
    actBytes: Uint8Array,
    options: LayaModelRunnerOptions,
  ): Promise<LayaModelRunner> {
    if (options.inputMode === LayaGraphInputMode.INPUTS_EMBEDS && !options.embeddingTable) {
      throw new Error('LayaModelRunner: inputs_embeds graphs need an embedding table');
    }
    const patcher = LayaTflitePatcher.tryCreate(mainBytes, options.window);
    const act = await loadAndCompile(actBytes, { accelerator: options.accelerator });
    const runner = new LayaModelRunner(mainBytes, patcher, act, options);
    try {
      const initialSlots = runner.computeOptimalSlots(options.initialHeadLengths ?? []);
      await runner.getOrCreateBucket(initialSlots);
    } catch (e) {
      runner.delete();
      throw e;
    }
    return runner;
  }

  get isFullyAccelerated(): boolean {
    const first = this.buckets.values().next().value as CompiledBucket | undefined;
    return first ? first.compiled.isFullyAccelerated : false;
  }

  /**
   * Computes the optimal slot sizes `[S_0, S_1, ...]` for a schema's question head lengths.
   * When all questions do not fit in a single window, computes a uniform multi-slot
   * chunk template `[S_0, ..., S_{K-1}]` reused across `ceil(Q / K)` passes without recompilation.
   */
  computeOptimalSlots(headLengths: readonly number[]): number[] {
    const W = this.options.window;
    if (!this.patcher) return [W];

    const Q = headLengths.length;
    if (Q <= 1) {
      const h = headLengths[0] ?? 0;
      return [this.pickSingleSlotSize(Math.min(W, h + 20))];
    }

    if (this.patcher.supportsMultiSlot) {
      let prevK = -1;
      for (let passes = 1; passes <= Q; passes++) {
        const K = Math.ceil(Q / passes);
        if (K === prevK) continue;
        prevK = K;
        if (K === 1) break;
        const maxHeadsPerSlot = LayaModelRunner.maxPerSlot(headLengths, K);
        const packed = this.computeMultiSlots(maxHeadsPerSlot, 19);
        if (packed) return packed;
      }
    }

    const maxHead = Math.max(...headLengths);
    return [this.pickSingleSlotSize(Math.min(W, maxHead + 20))];
  }

  /** Pre-compiles and warms up the given slot configuration. */
  async prepareSlots(slotSizes: readonly number[]): Promise<void> {
    if (!this.patcher) return;
    await this.getOrCreateBucket(slotSizes);
  }

  /**
   * Fast batch execution path that returns `token_logits` per question without
   * reading `pooled_cls` or running the `act` head.
   * Packs questions into one pass when they fit, or into `ceil(Q / K)` uniform
   * multi-slot passes sharing a single compiled bucket when `Q` is large.
   */
  async runTokensBatch(
    items: ReadonlyArray<{ ids: number[]; qtypeIndex: number }>,
    preferredSlots?: readonly number[],
  ): Promise<Float32Array[]> {
    if (items.length === 0) return [];
    const W = this.options.window;
    for (const item of items) {
      if (item.ids.length > W) {
        throw new Error(`LayaModelRunner: sequence of ${item.ids.length} exceeds window ${W}`);
      }
    }

    const slots = this.resolveBatchSlots(
      items.map((it) => it.ids.length),
      preferredSlots,
    );
    const bucket = await this.getOrCreateBucket(slots);
    const K = bucket.slotSizes.length;
    const out: Float32Array[] = [];

    for (let start = 0; start < items.length; start += K) {
      const chunk = items.slice(start, start + K);
      const logits = await this.executeBucketTokensOnly(bucket, chunk);
      if (K === 1) {
        out.push(logits);
      } else {
        let offset = 0;
        for (let b = 0; b < chunk.length; b++) {
          const S = bucket.slotSizes[b];
          out.push(logits.subarray(offset, offset + S));
          offset += S;
        }
      }
    }
    return out;
  }

  /** Runs the main graph on one unpadded id sequence (includes `pooledCls` for `runAct`). */
  async runMain(ids: number[], qtypeIndex: number): Promise<LayaMainOutput> {
    const W = this.options.window;
    if (ids.length > W) throw new Error(`LayaModelRunner: sequence of ${ids.length} exceeds window ${W}`);

    const n = this.pickSingleSlotSize(ids.length);
    const bucket = await this.getOrCreateBucket([n]);
    return this.executeSingleWithPooled(bucket, ids, qtypeIndex);
  }

  /** Runs the act head and returns `act_logits [2]`. */
  async runAct(pooledCls: Float32Array, feats: Float32Array): Promise<Float32Array> {
    const inputs: Record<string, Tensor> = {
      pooled_cls: new Tensor(pooledCls, [1, this.options.hidden]),
      feats: new Tensor(feats, [1, 4]),
    };
    try {
      const outputs = await this.act.run(inputs);
      try {
        return new Float32Array((await outputs['act_logits'].data()) as Float32Array);
      } finally {
        LayaModelRunner.deleteAll(outputs);
      }
    } finally {
      LayaModelRunner.deleteAll(inputs);
    }
  }

  delete(): void {
    this.act.delete();
    for (const bucket of this.buckets.values()) {
      LayaModelRunner.destroyBucket(bucket);
    }
    this.buckets.clear();
  }

  private resolveBatchSlots(
    seqLengths: readonly number[],
    preferredSlots?: readonly number[],
  ): readonly number[] {
    const W = this.options.window;
    if (!this.patcher) return [W];

    const Q = seqLengths.length;
    if (
      preferredSlots &&
      preferredSlots.length >= 1 &&
      preferredSlots.length <= Q &&
      (preferredSlots.length === 1 || this.patcher.supportsMultiSlot) &&
      seqLengths.every((len, idx) => len <= preferredSlots[idx % preferredSlots.length])
    ) {
      return preferredSlots;
    }

    if (Q > 1 && this.patcher.supportsMultiSlot) {
      let prevK = -1;
      for (let passes = 1; passes <= Q; passes++) {
        const K = Math.ceil(Q / passes);
        if (K === prevK) continue;
        prevK = K;
        if (K === 1) break;
        const maxLensPerSlot = LayaModelRunner.maxPerSlot(seqLengths, K);
        const slots = this.computeSlotsForLengths(maxLensPerSlot);
        if (slots) return slots;
      }
    }

    const maxLen = Math.max(...seqLengths);
    return [this.pickSingleSlotSize(maxLen)];
  }

  private static maxPerSlot(lengths: readonly number[], k: number): number[] {
    const maxes = new Array<number>(k).fill(0);
    for (let i = 0; i < lengths.length; i++) {
      const slot = i % k;
      if (lengths[i] > maxes[slot]) maxes[slot] = lengths[i];
    }
    return maxes;
  }

  private pickSingleSlotSize(seqLen: number): number {
    const W = this.options.window;
    if (!this.patcher) return W;
    for (const b of SINGLE_BUCKETS) {
      if (b <= W && seqLen <= b) return b;
    }
    return W;
  }

  private computeMultiSlots(headLengths: readonly number[], targetStateRoom: number): number[] | null {
    const W = this.options.window;
    const Q = headLengths.length;
    const sumH = headLengths.reduce((acc, h) => acc + h, 0);
    const minNeeded = sumH + Q * 16;
    if (minNeeded > W) return null;

    const desired = sumH + Q * (targetStateRoom + 1);
    const M = Math.min(W, Math.max(64, Math.ceil(desired / 16) * 16));

    const totalExtra = M - sumH;
    const extraPerQ = Math.floor(totalExtra / Q);
    const rem = totalExtra - extraPerQ * Q;
    return headLengths.map((h, i) => h + extraPerQ + (i < rem ? 1 : 0));
  }

  private computeSlotsForLengths(seqLengths: readonly number[]): number[] | null {
    const W = this.options.window;
    const Q = seqLengths.length;
    const sumL = seqLengths.reduce((acc, l) => acc + l, 0);
    if (sumL > W) return null;

    const M = Math.min(W, Math.max(64, Math.ceil(sumL / 16) * 16));
    const totalExtra = M - sumL;
    const extraPerQ = Math.floor(totalExtra / Q);
    const rem = totalExtra - extraPerQ * Q;
    return seqLengths.map((l, i) => l + extraPerQ + (i < rem ? 1 : 0));
  }

  private async getOrCreateBucket(slotSizes: readonly number[]): Promise<CompiledBucket> {
    const normalizedSlots = this.patcher ? slotSizes : [this.options.window];
    const key = normalizedSlots.join(',');
    const existing = this.buckets.get(key);
    if (existing) {
      // Refresh LRU order
      this.buckets.delete(key);
      this.buckets.set(key, existing);
      return existing;
    }

    if (this.buckets.size >= MAX_COMPILED_BUCKETS) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey !== undefined) {
        const oldest = this.buckets.get(oldestKey)!;
        this.buckets.delete(oldestKey);
        LayaModelRunner.destroyBucket(oldest);
      }
    }

    if (this.patcher) {
      this.patcher.patchSlots(normalizedSlots);
    }

    const compiled = await loadAndCompile(this.mainBytes, { accelerator: this.options.accelerator });
    const B = normalizedSlots.length;
    const totalLen = normalizedSlots.reduce((acc, s) => acc + s, 0);
    this.validateSignatures(compiled, totalLen);

    const hidden = this.options.hidden;
    const maskBuf = new Float32Array(B > 1 ? totalLen * totalLen : totalLen);
    const qtypeBuf = new Float32Array(B > 1 ? totalLen * 3 : 3);
    const embedsBuf =
      this.options.inputMode === LayaGraphInputMode.INPUTS_EMBEDS
        ? new Float32Array(totalLen * hidden)
        : undefined;
    const inputIdsBuf =
      this.options.inputMode === LayaGraphInputMode.TOKEN_IDS ? new Int32Array(totalLen) : undefined;

    let gpuDevice: any;
    let gpuEmbedsBuf: any;
    let gpuMaskBuf: any;
    let gpuQtypeBuf: any;
    let gpuReadbackBuf: any;
    let gpuEmbedsTensor: Tensor | undefined;
    let gpuMaskTensor: Tensor | undefined;
    let gpuQtypeTensor: Tensor | undefined;
    let liteRtCompiledModel: any;
    let liteRtWasm: any;
    let signatureIndex: number | undefined;
    let gpuInputTensorBuffers: any[] | undefined;
    let tokenLogitsOutputIndex: number | undefined;

    const env = (compiled as any).options?.environment;
    if (
      this.options.accelerator === 'webgpu' &&
      this.options.inputMode === LayaGraphInputMode.INPUTS_EMBEDS &&
      env?.webGpuDevice &&
      typeof GPUBufferUsage !== 'undefined' &&
      typeof GPUMapMode !== 'undefined'
    ) {
      gpuDevice = env.webGpuDevice;
      const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
      gpuEmbedsBuf = gpuDevice.createBuffer({ size: Math.max(16, embedsBuf!.byteLength), usage });
      gpuMaskBuf = gpuDevice.createBuffer({ size: Math.max(16, maskBuf.byteLength), usage });
      gpuQtypeBuf = gpuDevice.createBuffer({ size: Math.max(16, qtypeBuf.byteLength), usage });
      gpuReadbackBuf = gpuDevice.createBuffer({
        size: Math.max(16, totalLen * 4),
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      gpuEmbedsTensor = new Tensor(gpuEmbedsBuf, [1, totalLen, hidden], 'float32', env);
      gpuMaskTensor = new Tensor(gpuMaskBuf, B > 1 ? [totalLen, totalLen] : [1, totalLen], 'float32', env);
      gpuQtypeTensor = new Tensor(gpuQtypeBuf, B > 1 ? [totalLen, 3] : [1, 3], 'float32', env);

      try {
        liteRtWasm = getGlobalLiteRt().liteRtWasm;
        liteRtCompiledModel = (compiled as any).liteRtCompiledModel;
        signatureIndex = (compiled as any).defaultSignature?.signatureIndex ?? 0;
        const tensorByName: Record<string, Tensor> = {
          inputs_embeds: gpuEmbedsTensor,
          attention_mask: gpuMaskTensor,
          qtype_onehot: gpuQtypeTensor,
        };
        const inDetails = compiled.getInputDetails();
        const outDetails = compiled.getOutputDetails();
        if (inDetails.every((d) => tensorByName[d.name]?.liteRtTensorBuffer)) {
          gpuInputTensorBuffers = inDetails.map((d) => tensorByName[d.name].liteRtTensorBuffer);
        }
        const outIdx = outDetails.findIndex((d) => d.name === 'token_logits');
        if (outIdx >= 0) tokenLogitsOutputIndex = outIdx;
      } catch {
        // Fallback to standard compiled.run() if internal handles are unavailable.
      }
    }

    const bucket: CompiledBucket = {
      key,
      slotSizes: normalizedSlots,
      totalLen,
      compiled,
      maskBuf,
      qtypeBuf,
      embedsBuf,
      inputIdsBuf,
      gpuDevice,
      gpuEmbedsBuf,
      gpuMaskBuf,
      gpuQtypeBuf,
      gpuReadbackBuf,
      gpuEmbedsTensor,
      gpuMaskTensor,
      gpuQtypeTensor,
      liteRtCompiledModel,
      liteRtWasm,
      signatureIndex,
      gpuInputTensorBuffers,
      tokenLogitsOutputIndex,
    };

    // Warm up WebGPU shader pipelines immediately so the first classify() call is fast.
    if (bucket.gpuEmbedsTensor) {
      const dummyItems = normalizedSlots.map(() => ({ ids: [this.options.padId], qtypeIndex: 0 }));
      await this.executeBucketTokensOnly(bucket, dummyItems);
    }

    this.buckets.set(key, bucket);
    return bucket;
  }

  private fillBucketBuffers(
    bucket: CompiledBucket,
    items: ReadonlyArray<{ ids: number[]; qtypeIndex: number }>,
  ): void {
    const B = bucket.slotSizes.length;
    const M = bucket.totalLen;
    const hidden = this.options.hidden;
    const padId = this.options.padId;

    bucket.maskBuf.fill(0);
    bucket.qtypeBuf.fill(0);

    if (B === 1) {
      const item = items[0];
      for (let i = 0; i < item.ids.length; i++) bucket.maskBuf[i] = 1;
      bucket.qtypeBuf[item.qtypeIndex] = 1;
      if (this.options.inputMode === LayaGraphInputMode.TOKEN_IDS) {
        bucket.inputIdsBuf!.fill(padId);
        bucket.inputIdsBuf!.set(item.ids);
      } else {
        this.options.embeddingTable!.gatherInto(item.ids, M, padId, bucket.embedsBuf!, 0);
      }
      return;
    }

    let slotBase = 0;
    for (let b = 0; b < B; b++) {
      const S = bucket.slotSizes[b];
      const item = items[b];
      const ids = item ? item.ids : [padId];
      const qtypeIndex = item ? item.qtypeIndex : 0;
      const validLen = ids.length;
      for (let r = 0; r < S; r++) {
        const rowOff = (slotBase + r) * M + slotBase;
        bucket.maskBuf.fill(1, rowOff, rowOff + validLen);
      }
      for (let i = 0; i < S; i++) {
        bucket.qtypeBuf[(slotBase + i) * 3 + qtypeIndex] = 1;
      }
      if (this.options.inputMode === LayaGraphInputMode.TOKEN_IDS) {
        bucket.inputIdsBuf!.fill(padId, slotBase, slotBase + S);
        bucket.inputIdsBuf!.set(ids, slotBase);
      } else {
        this.options.embeddingTable!.gatherInto(ids, S, padId, bucket.embedsBuf!, slotBase * hidden);
      }
      slotBase += S;
    }
  }

  private async executeBucketTokensOnly(
    bucket: CompiledBucket,
    items: ReadonlyArray<{ ids: number[]; qtypeIndex: number }>,
  ): Promise<Float32Array> {
    this.fillBucketBuffers(bucket, items);

    if (bucket.gpuDevice && bucket.gpuEmbedsTensor && bucket.gpuMaskTensor && bucket.gpuQtypeTensor) {
      bucket.gpuDevice.queue.writeBuffer(bucket.gpuEmbedsBuf, 0, bucket.embedsBuf!);
      bucket.gpuDevice.queue.writeBuffer(bucket.gpuMaskBuf, 0, bucket.maskBuf);
      bucket.gpuDevice.queue.writeBuffer(bucket.gpuQtypeBuf, 0, bucket.qtypeBuf);

      if (
        bucket.liteRtCompiledModel &&
        bucket.liteRtWasm &&
        bucket.gpuInputTensorBuffers &&
        bucket.tokenLogitsOutputIndex !== undefined &&
        bucket.gpuReadbackBuf &&
        typeof GPUMapMode !== 'undefined'
      ) {
        const outBuffers: any[] = await bucket.liteRtCompiledModel.run(
          bucket.signatureIndex ?? 0,
          bucket.gpuInputTensorBuffers,
        );
        try {
          const tb = outBuffers[bucket.tokenLogitsOutputIndex];
          if (tb.isWebGpuMemory()) {
            const srcGpuBuf = bucket.liteRtWasm.WebGPU.getJsObject(tb.getWebGpuBuffer());
            const byteOffset = tb.offset();
            const byteLen = bucket.totalLen * 4;
            const enc = bucket.gpuDevice.createCommandEncoder();
            enc.copyBufferToBuffer(srcGpuBuf, byteOffset, bucket.gpuReadbackBuf, 0, byteLen);
            bucket.gpuDevice.queue.submit([enc.finish()]);
            await bucket.gpuReadbackBuf.mapAsync(GPUMapMode.READ, 0, byteLen);
            try {
              const out = new Float32Array(bucket.totalLen);
              out.set(new Float32Array(bucket.gpuReadbackBuf.getMappedRange(0, byteLen)));
              return out;
            } finally {
              bucket.gpuReadbackBuf.unmap();
            }
          }
        } finally {
          for (const tb of outBuffers) {
            try {
              tb.delete();
            } catch {}
          }
        }
      }

      const outputs = await bucket.compiled.run({
        inputs_embeds: bucket.gpuEmbedsTensor,
        attention_mask: bucket.gpuMaskTensor,
        qtype_onehot: bucket.gpuQtypeTensor,
      });
      try {
        const tokenLogits = (await outputs['token_logits'].data()) as Float32Array;
        return new Float32Array(tokenLogits);
      } finally {
        LayaModelRunner.deleteAll(outputs);
      }
    }

    const B = bucket.slotSizes.length;
    const M = bucket.totalLen;
    const inputs: Record<string, Tensor> = {
      attention_mask: new Tensor(bucket.maskBuf, B > 1 ? [M, M] : [1, M]),
      qtype_onehot: new Tensor(bucket.qtypeBuf, B > 1 ? [M, 3] : [1, 3]),
    };
    if (this.options.inputMode === LayaGraphInputMode.TOKEN_IDS) {
      inputs['input_ids'] = new Tensor(bucket.inputIdsBuf!, [1, M]);
    } else {
      inputs['inputs_embeds'] = new Tensor(bucket.embedsBuf!, [1, M, this.options.hidden]);
    }

    try {
      const outputs = await bucket.compiled.run(inputs);
      try {
        const tokenLogits = (await outputs['token_logits'].data()) as Float32Array;
        return new Float32Array(tokenLogits);
      } finally {
        LayaModelRunner.deleteAll(outputs);
      }
    } finally {
      LayaModelRunner.deleteAll(inputs);
    }
  }

  private async executeSingleWithPooled(
    bucket: CompiledBucket,
    ids: number[],
    qtypeIndex: number,
  ): Promise<LayaMainOutput> {
    this.fillBucketBuffers(bucket, [{ ids, qtypeIndex }]);

    if (bucket.gpuDevice && bucket.gpuEmbedsTensor && bucket.gpuMaskTensor && bucket.gpuQtypeTensor) {
      bucket.gpuDevice.queue.writeBuffer(bucket.gpuEmbedsBuf, 0, bucket.embedsBuf!);
      bucket.gpuDevice.queue.writeBuffer(bucket.gpuMaskBuf, 0, bucket.maskBuf);
      bucket.gpuDevice.queue.writeBuffer(bucket.gpuQtypeBuf, 0, bucket.qtypeBuf);
      const outputs = await bucket.compiled.run({
        inputs_embeds: bucket.gpuEmbedsTensor,
        attention_mask: bucket.gpuMaskTensor,
        qtype_onehot: bucket.gpuQtypeTensor,
      });
      try {
        const tokenLogits = (await outputs['token_logits'].data()) as Float32Array;
        const pooledCls = (await outputs['pooled_cls'].data()) as Float32Array;
        return { tokenLogits: new Float32Array(tokenLogits), pooledCls: new Float32Array(pooledCls) };
      } finally {
        LayaModelRunner.deleteAll(outputs);
      }
    }

    const M = bucket.totalLen;
    const inputs: Record<string, Tensor> = {
      attention_mask: new Tensor(bucket.maskBuf, [1, M]),
      qtype_onehot: new Tensor(bucket.qtypeBuf, [1, 3]),
    };
    if (this.options.inputMode === LayaGraphInputMode.TOKEN_IDS) {
      inputs['input_ids'] = new Tensor(bucket.inputIdsBuf!, [1, M]);
    } else {
      inputs['inputs_embeds'] = new Tensor(bucket.embedsBuf!, [1, M, this.options.hidden]);
    }

    try {
      const outputs = await bucket.compiled.run(inputs);
      try {
        const tokenLogits = (await outputs['token_logits'].data()) as Float32Array;
        const pooledCls = (await outputs['pooled_cls'].data()) as Float32Array;
        return { tokenLogits: new Float32Array(tokenLogits), pooledCls: new Float32Array(pooledCls) };
      } finally {
        LayaModelRunner.deleteAll(outputs);
      }
    } finally {
      LayaModelRunner.deleteAll(inputs);
    }
  }

  private validateSignatures(compiled: CompiledModel, expectedLen: number): void {
    const mainInputs = compiled.getInputDetails().map((d) => d.name);
    const expected =
      this.options.inputMode === LayaGraphInputMode.TOKEN_IDS ? 'input_ids' : 'inputs_embeds';
    if (!mainInputs.includes(expected)) {
      throw new Error(
        `LayaModelRunner: main graph inputs [${mainInputs.join(', ')}] do not include "${expected}"`,
      );
    }
    const window = compiled.getInputDetails().find((d) => d.name === 'attention_mask')?.shape[1];
    if (window !== undefined && window !== expectedLen) {
      throw new Error(`LayaModelRunner: graph window ${window} does not match configured ${expectedLen}`);
    }
  }

  private static destroyBucket(bucket: CompiledBucket): void {
    for (const t of [bucket.gpuEmbedsTensor, bucket.gpuMaskTensor, bucket.gpuQtypeTensor]) {
      try {
        t?.delete();
      } catch {}
    }
    for (const b of [bucket.gpuEmbedsBuf, bucket.gpuMaskBuf, bucket.gpuQtypeBuf, bucket.gpuReadbackBuf]) {
      try {
        b?.destroy();
      } catch {}
    }
    try {
      bucket.compiled.delete();
    } catch {}
  }

  private static deleteAll(tensors: Record<string, Tensor>): void {
    for (const t of Object.values(tensors)) {
      try {
        t.delete();
      } catch {
        // Already deleted by the runtime.
      }
    }
  }
}
