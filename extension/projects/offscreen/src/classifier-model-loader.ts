import { isWebGPUSupported, loadLiteRt } from '@litertjs/core';
import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import { ClassifierModelFileRole } from '../../base/src/lib/classifier/enums/classifier-model-file-role.enum';
import { ClassifierModelInputMode } from '../../base/src/lib/classifier/enums/classifier-model-input-mode.enum';
import { LayaTokenizer } from '../../laya/src/laya-tokenizer';
import { LayaSequenceBuilder } from '../../laya/src/laya-sequence.builder';
import { LayaEmbeddingTable } from '../../laya/src/laya-embedding-table';
import { LayaModelRunner } from '../../laya/src/laya-model-runner';
import { LayaGraphInputMode } from '../../laya/src/laya-graph-input-mode.enum';
import { LayaHost } from '../../laya/src/laya-host';
import { LayaCalibration } from '../../laya/src/laya-calibration.interface';
import { ClassifierModelStore } from './classifier-model-store';
import { ClassifierLoadedModel } from './classifier-loaded-model.interface';

declare const chrome: any;

const EMBEDDING_ROWS = 256000;

/** Builds a LayaHost for a cached variant: loads LiteRT.js, tokenizer, calibration, and both graphs. */
export class ClassifierModelLoader {
  private static liteRtReady: Promise<void> | null = null;

  static async load(variant: ClassifierModelVariant, store: ClassifierModelStore): Promise<ClassifierLoadedModel> {
    await ClassifierModelLoader.ensureLiteRt();

    const tokenizerJson = JSON.parse(await store.readText(variant, ClassifierModelFileRole.TOKENIZER));
    const tokenizerConfig = JSON.parse(await store.readText(variant, ClassifierModelFileRole.TOKENIZER_CONFIG));
    const calibration = JSON.parse(await store.readText(variant, ClassifierModelFileRole.CALIBRATION)) as LayaCalibration;

    const tokenizer = new LayaTokenizer(tokenizerJson, tokenizerConfig);
    const builder = new LayaSequenceBuilder(tokenizer, variant.window, variant.headMaxLen);

    const embeddingTable =
      variant.inputMode === ClassifierModelInputMode.INPUTS_EMBEDS
        ? new LayaEmbeddingTable(
            await store.read(variant, ClassifierModelFileRole.EMBEDDING_TABLE),
            EMBEDDING_ROWS,
            variant.hidden,
          )
        : undefined;

    const mainBytes = new Uint8Array(await store.read(variant, ClassifierModelFileRole.MAIN_GRAPH));
    const actBytes = new Uint8Array(await store.read(variant, ClassifierModelFileRole.ACT_HEAD));

    const accelerators: Array<'webgpu' | 'wasm'> =
      variant.gpuCompiles && isWebGPUSupported() ? ['webgpu', 'wasm'] : ['wasm'];

    let lastError: unknown;
    for (const accelerator of accelerators) {
      try {
        const runner = await LayaModelRunner.load(mainBytes, actBytes, {
          window: variant.window,
          hidden: variant.hidden,
          padId: tokenizer.padId,
          inputMode:
            variant.inputMode === ClassifierModelInputMode.INPUTS_EMBEDS
              ? LayaGraphInputMode.INPUTS_EMBEDS
              : LayaGraphInputMode.TOKEN_IDS,
          accelerator,
          embeddingTable,
        });
        const host = new LayaHost(tokenizer, builder, runner, calibration, variant.window);
        console.log(`WebAI Classifier: loaded ${variant.id} on ${accelerator}`);
        return { variant, host, accelerator };
      } catch (e) {
        console.warn(`WebAI Classifier: ${accelerator} compilation failed for ${variant.id}`, e);
        lastError = e;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private static ensureLiteRt(): Promise<void> {
    if (!ClassifierModelLoader.liteRtReady) {
      ClassifierModelLoader.liteRtReady = loadLiteRt(chrome.runtime.getURL('wasm/'))
        .then(() => undefined)
        .catch((e) => {
          ClassifierModelLoader.liteRtReady = null;
          throw e;
        });
    }
    return ClassifierModelLoader.liteRtReady;
  }
}
