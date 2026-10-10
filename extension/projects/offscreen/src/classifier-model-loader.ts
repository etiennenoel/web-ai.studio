import { isWebGPUSupported, loadLiteRt, supportsFeature } from '@litertjs/core';
import { ClassifierModelVariant } from '../../base/src/lib/classifier/interfaces/classifier-model-variant.interface';
import { ClassifierModelFileRole } from '../../base/src/lib/classifier/enums/classifier-model-file-role.enum';
import { ClassifierModelInputMode } from '../../base/src/lib/classifier/enums/classifier-model-input-mode.enum';
import {
  ClassifierAccelerator,
  ClassifierAcceleratorPreference,
  ClassifierWebNNDevicePreference,
} from '../../base/src/lib/classifier/types/classifier-accelerator.type';
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

export interface ClassifierModelLoaderOptions {
  acceleratorPreference?: ClassifierAcceleratorPreference;
  webnnDevicePreference?: ClassifierWebNNDevicePreference;
}

/** Builds a LayaHost for a cached variant: loads LiteRT.js, tokenizer, calibration, and both graphs. */
export class ClassifierModelLoader {
  private static liteRtReady: Promise<void> | null = null;

  static async load(
    variant: ClassifierModelVariant,
    store: ClassifierModelStore,
    options: ClassifierModelLoaderOptions = {},
  ): Promise<ClassifierLoadedModel> {
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

    const acceleratorPreference: ClassifierAcceleratorPreference = options.acceleratorPreference ?? 'auto';
    const webnnDevicePreference: ClassifierWebNNDevicePreference = options.webnnDevicePreference ?? 'auto';

    const webgpuSupported = isWebGPUSupported();
    const webnnSupported = await ClassifierModelLoader.isWebNNSupported();
    const accelerators = ClassifierModelLoader.resolveAccelerators(
      variant,
      acceleratorPreference,
      webgpuSupported,
      webnnSupported,
    );

    const inputMode =
      variant.inputMode === ClassifierModelInputMode.INPUTS_EMBEDS
        ? LayaGraphInputMode.INPUTS_EMBEDS
        : LayaGraphInputMode.TOKEN_IDS;

    let lastError: unknown;
    for (const accelerator of accelerators) {
      const candidateDevices: ClassifierWebNNDevicePreference[] =
        accelerator === 'webnn' && webnnDevicePreference !== 'auto'
          ? [webnnDevicePreference, 'auto']
          : [webnnDevicePreference];

      for (const devicePref of candidateDevices) {
        try {
          const runner = await LayaModelRunner.load(mainBytes, actBytes, {
            window: variant.window,
            hidden: variant.hidden,
            padId: tokenizer.padId,
            inputMode,
            accelerator,
            webNNOptions:
              accelerator === 'webnn' && devicePref !== 'auto'
                ? { devicePreference: devicePref }
                : undefined,
            embeddingTable,
          });
          const host = new LayaHost(tokenizer, builder, runner, calibration, variant.window);
          const resolvedDevicePref = accelerator === 'webnn' ? devicePref : undefined;
          console.log(
            `WebAI Classifier: loaded ${variant.id} on ${accelerator}${
              resolvedDevicePref && resolvedDevicePref !== 'auto' ? ` (${resolvedDevicePref})` : ''
            }`,
          );
          return {
            variant,
            host,
            accelerator,
            acceleratorPreference,
            webnnDevicePreference: resolvedDevicePref,
          };
        } catch (e) {
          console.warn(
            `WebAI Classifier: ${accelerator}${
              accelerator === 'webnn' && devicePref !== 'auto' ? ` (${devicePref})` : ''
            } compilation failed for ${variant.id}`,
            e,
          );
          lastError = e;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Resolves the ordered list of accelerators to attempt for a given model variant
   * and user preference. Auto mode prioritizes WebGPU -> WebNN -> WASM.
   */
  static resolveAccelerators(
    variant: ClassifierModelVariant,
    preference: ClassifierAcceleratorPreference,
    webgpuSupported: boolean,
    webnnSupported: boolean,
  ): ClassifierAccelerator[] {
    const gpuOk = variant.gpuCompiles && webgpuSupported;
    const webnnOk = variant.webnnCompiles !== false && webnnSupported;

    const list: ClassifierAccelerator[] = [];
    const pushUnique = (acc: ClassifierAccelerator) => {
      if (!list.includes(acc)) list.push(acc);
    };

    if (preference === 'wasm') {
      return ['wasm'];
    }

    if (preference === 'webgpu') {
      if (webgpuSupported) pushUnique('webgpu');
      if (webnnOk) pushUnique('webnn');
      pushUnique('wasm');
      return list;
    }

    if (preference === 'webnn') {
      if (webnnSupported) pushUnique('webnn');
      if (gpuOk) pushUnique('webgpu');
      pushUnique('wasm');
      return list;
    }

    // 'auto': WebGPU -> WebNN -> WASM
    if (gpuOk) pushUnique('webgpu');
    if (webnnOk) pushUnique('webnn');
    pushUnique('wasm');
    return list;
  }

  static async isWebNNSupported(): Promise<boolean> {
    try {
      const [webnn, jspi] = await Promise.all([
        supportsFeature('webnn').catch(() => false),
        supportsFeature('jspi').catch(() => false),
      ]);
      return webnn && jspi;
    } catch {
      return false;
    }
  }

  private static ensureLiteRt(): Promise<void> {
    if (!ClassifierModelLoader.liteRtReady) {
      ClassifierModelLoader.liteRtReady = supportsFeature('jspi')
        .catch(() => false)
        .then((jspi) => loadLiteRt(chrome.runtime.getURL('wasm/'), { jspi }))
        .then(() => undefined)
        .catch((e) => {
          ClassifierModelLoader.liteRtReady = null;
          throw e;
        });
    }
    return ClassifierModelLoader.liteRtReady;
  }
}
