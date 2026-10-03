import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ClassifierModelLoader } from './classifier-model-loader';
import { CLASSIFIER_MODEL_REGISTRY } from '../../base/src/lib/classifier/registry/classifier-model-registry.const';
import * as litertCore from '@litertjs/core';
import { LayaModelRunner } from '../../laya/src/laya-model-runner';

vi.mock('../../laya/src/laya-tokenizer', () => ({
  LayaTokenizer: class {
    readonly clsId = 1;
    readonly sepId = 2;
    readonly padId = 0;
    readonly maskId = 3;
    readonly maskToken = '<mask>';
    encode() {
      return [10];
    }
  },
}));

vi.mock('@litertjs/core', async () => {
  const actual = await vi.importActual<typeof import('@litertjs/core')>('@litertjs/core');
  return {
    ...actual,
    isWebGPUSupported: vi.fn(),
    loadLiteRt: vi.fn(),
    supportsFeature: vi.fn(),
  };
});

describe('ClassifierModelLoader', () => {
  const gpuVariant = CLASSIFIER_MODEL_REGISTRY.find((v) => v.id === 'laya-ml-s256-embeds-wfp16')!;
  const nonGpuVariant = CLASSIFIER_MODEL_REGISTRY.find((v) => v.id === 'laya-ml-s256-wfp16')!;

  beforeEach(() => {
    vi.clearAllMocks();
    (ClassifierModelLoader as any).liteRtReady = null;
    (globalThis as any).chrome = {
      runtime: {
        getURL: (p: string) => `chrome-extension://test/${p}`,
      },
    };
  });

  describe('resolveAccelerators', () => {
    it('prioritizes WebGPU -> WebNN -> WASM in auto mode when both are supported', () => {
      expect(ClassifierModelLoader.resolveAccelerators(gpuVariant, 'auto', true, true)).toEqual([
        'webgpu',
        'webnn',
        'wasm',
      ]);
    });

    it('uses WebNN -> WASM in auto mode when variant does not compile on WebGPU', () => {
      expect(ClassifierModelLoader.resolveAccelerators(nonGpuVariant, 'auto', true, true)).toEqual([
        'webnn',
        'wasm',
      ]);
    });

    it('prioritizes WebNN first when preference is webnn, falling back to WebGPU then WASM', () => {
      expect(ClassifierModelLoader.resolveAccelerators(gpuVariant, 'webnn', true, true)).toEqual([
        'webnn',
        'webgpu',
        'wasm',
      ]);
    });

    it('returns only wasm when preference is wasm', () => {
      expect(ClassifierModelLoader.resolveAccelerators(gpuVariant, 'wasm', true, true)).toEqual(['wasm']);
    });
  });

  describe('load', () => {
    const fakeStore: any = {
      readText: vi.fn().mockImplementation(async (_v: any, role: string) => {
        if (role === 'calibration') return JSON.stringify({ temperature: [1, 1, 1] });
        return JSON.stringify({});
      }),
      read: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
    };

    it('loads LiteRT with jspi enabled when JSPI is supported and passes webNNOptions', async () => {
      vi.mocked(litertCore.supportsFeature).mockImplementation(async (feature) => {
        return feature === 'jspi' || feature === 'webnn';
      });
      vi.mocked(litertCore.isWebGPUSupported).mockReturnValue(false);
      vi.mocked(litertCore.loadLiteRt).mockResolvedValue({} as any);

      const fakeRunner: any = { delete: vi.fn() };
      const runnerLoadSpy = vi.spyOn(LayaModelRunner, 'load').mockResolvedValue(fakeRunner);

      const loaded = await ClassifierModelLoader.load(nonGpuVariant, fakeStore, {
        acceleratorPreference: 'webnn',
        webnnDevicePreference: 'npu',
      });

      expect(litertCore.loadLiteRt).toHaveBeenCalledWith('chrome-extension://test/wasm/', { jspi: true });
      expect(runnerLoadSpy).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        expect.any(Uint8Array),
        expect.objectContaining({
          accelerator: 'webnn',
          webNNOptions: { devicePreference: 'npu' },
        }),
      );
      expect(loaded.accelerator).toBe('webnn');
      expect(loaded.webnnDevicePreference).toBe('npu');
    });

    it('falls back from specific WebNN devicePreference to default WebNN before falling back to WASM', async () => {
      vi.mocked(litertCore.supportsFeature).mockResolvedValue(true);
      vi.mocked(litertCore.isWebGPUSupported).mockReturnValue(false);
      vi.mocked(litertCore.loadLiteRt).mockResolvedValue({} as any);

      const fakeRunner: any = { delete: vi.fn() };
      const runnerLoadSpy = vi
        .spyOn(LayaModelRunner, 'load')
        .mockRejectedValueOnce(new Error('NPU device not available'))
        .mockResolvedValueOnce(fakeRunner);

      const loaded = await ClassifierModelLoader.load(nonGpuVariant, fakeStore, {
        acceleratorPreference: 'webnn',
        webnnDevicePreference: 'npu',
      });

      expect(runnerLoadSpy).toHaveBeenCalledTimes(2);
      expect(runnerLoadSpy).toHaveBeenNthCalledWith(
        1,
        expect.any(Uint8Array),
        expect.any(Uint8Array),
        expect.objectContaining({
          accelerator: 'webnn',
          webNNOptions: { devicePreference: 'npu' },
        }),
      );
      expect(runnerLoadSpy).toHaveBeenNthCalledWith(
        2,
        expect.any(Uint8Array),
        expect.any(Uint8Array),
        expect.objectContaining({
          accelerator: 'webnn',
          webNNOptions: undefined,
        }),
      );
      expect(loaded.accelerator).toBe('webnn');
      expect(loaded.webnnDevicePreference).toBe('auto');
    });
  });
});
