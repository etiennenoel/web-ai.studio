import { CompiledModel, Tensor, loadAndCompile } from '@litertjs/core';
import { LayaModelRunnerOptions } from './laya-model-runner-options.interface';
import { LayaGraphInputMode } from './laya-graph-input-mode.enum';
import { LayaMainOutput } from './laya-main-output.interface';

/**
 * Runs the Laya main graph and act head with LiteRT.js.
 * `loadLiteRt()` must have completed before `load()` is called.
 */
export class LayaModelRunner {
  private constructor(
    private readonly main: CompiledModel,
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
    const main = await loadAndCompile(mainBytes, { accelerator: options.accelerator });
    let act: CompiledModel;
    try {
      act = await loadAndCompile(actBytes, { accelerator: options.accelerator });
    } catch (e) {
      main.delete();
      throw e;
    }
    const runner = new LayaModelRunner(main, act, options);
    runner.validateSignatures();
    return runner;
  }

  get isFullyAccelerated(): boolean {
    return this.main.isFullyAccelerated;
  }

  /** Runs the main graph on one unpadded id sequence. */
  async runMain(ids: number[], qtypeIndex: number): Promise<LayaMainOutput> {
    const n = this.options.window;
    if (ids.length > n) throw new Error(`LayaModelRunner: sequence of ${ids.length} exceeds window ${n}`);

    const attentionMask = new Float32Array(n);
    for (let i = 0; i < ids.length; i++) attentionMask[i] = 1;
    const qtype = new Float32Array(3);
    qtype[qtypeIndex] = 1;

    const inputs: Record<string, Tensor> = {
      attention_mask: new Tensor(attentionMask, [1, n]),
      qtype_onehot: new Tensor(qtype, [1, 3]),
    };
    if (this.options.inputMode === LayaGraphInputMode.TOKEN_IDS) {
      const inputIds = new Int32Array(n).fill(this.options.padId);
      inputIds.set(ids);
      inputs['input_ids'] = new Tensor(inputIds, [1, n]);
    } else {
      const embeds = this.options.embeddingTable!.gather(ids, n, this.options.padId);
      inputs['inputs_embeds'] = new Tensor(embeds, [1, n, this.options.hidden]);
    }

    try {
      const outputs = await this.main.run(inputs);
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
    this.main.delete();
  }

  private validateSignatures(): void {
    const mainInputs = this.main.getInputDetails().map((d) => d.name);
    const expected =
      this.options.inputMode === LayaGraphInputMode.TOKEN_IDS ? 'input_ids' : 'inputs_embeds';
    if (!mainInputs.includes(expected)) {
      throw new Error(
        `LayaModelRunner: main graph inputs [${mainInputs.join(', ')}] do not include "${expected}"`,
      );
    }
    const window = this.main.getInputDetails().find((d) => d.name === 'attention_mask')?.shape[1];
    if (window !== undefined && window !== this.options.window) {
      throw new Error(`LayaModelRunner: graph window ${window} does not match configured ${this.options.window}`);
    }
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
