import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LayaModelRunner } from './laya-model-runner';
import { LayaGraphInputMode } from './laya-graph-input-mode.enum';
import * as litertCore from '@litertjs/core';

vi.mock('@litertjs/core', async () => {
  const actual = await vi.importActual<typeof import('@litertjs/core')>('@litertjs/core');
  return {
    ...actual,
    loadAndCompile: vi.fn(),
  };
});

function createMockCompiledModel(inputs: Array<{ name: string; shape: number[] }>): any {
  return {
    isFullyAccelerated: true,
    getInputDetails: () => inputs.map((d, index) => ({
      name: d.name,
      index,
      dtype: 'float32',
      shape: new Int32Array(d.shape),
      supportedBufferTypes: new Set([1]),
    })),
    run: vi.fn(),
    delete: vi.fn(),
  };
}

describe('LayaModelRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compiles main and act graphs with WebNN accelerator and webNNOptions', async () => {
    const mainModel = createMockCompiledModel([
      { name: 'input_ids', shape: [1, 256] },
      { name: 'attention_mask', shape: [1, 256] },
      { name: 'qtype_onehot', shape: [1, 3] },
    ]);
    const actModel = createMockCompiledModel([
      { name: 'pooled_cls', shape: [1, 768] },
      { name: 'feats', shape: [1, 4] },
    ]);

    const loadAndCompileMock = vi.mocked(litertCore.loadAndCompile);
    loadAndCompileMock.mockResolvedValueOnce(mainModel).mockResolvedValueOnce(actModel);

    const mainBytes = new Uint8Array([1, 2, 3]);
    const actBytes = new Uint8Array([4, 5, 6]);

    const runner = await LayaModelRunner.load(mainBytes, actBytes, {
      window: 256,
      hidden: 768,
      padId: 0,
      inputMode: LayaGraphInputMode.TOKEN_IDS,
      accelerator: 'webnn',
      webNNOptions: {
        devicePreference: 'npu',
        powerPreference: 'high-performance',
      },
    });

    expect(loadAndCompileMock).toHaveBeenCalledTimes(2);
    expect(loadAndCompileMock).toHaveBeenNthCalledWith(1, mainBytes, {
      accelerator: 'webnn',
      webNNOptions: {
        devicePreference: 'npu',
        powerPreference: 'high-performance',
      },
    });
    expect(loadAndCompileMock).toHaveBeenNthCalledWith(2, actBytes, {
      accelerator: 'webnn',
      webNNOptions: {
        devicePreference: 'npu',
        powerPreference: 'high-performance',
      },
    });
    expect(runner.isFullyAccelerated).toBe(true);
    runner.delete();
    expect(mainModel.delete).toHaveBeenCalled();
    expect(actModel.delete).toHaveBeenCalled();
  });

  it('falls back to wasm for the act head if WebNN act compilation fails', async () => {
    const mainModel = createMockCompiledModel([
      { name: 'input_ids', shape: [1, 256] },
      { name: 'attention_mask', shape: [1, 256] },
      { name: 'qtype_onehot', shape: [1, 3] },
    ]);
    const actModel = createMockCompiledModel([
      { name: 'pooled_cls', shape: [1, 768] },
      { name: 'feats', shape: [1, 4] },
    ]);

    const loadAndCompileMock = vi.mocked(litertCore.loadAndCompile);
    loadAndCompileMock
      .mockResolvedValueOnce(mainModel)
      .mockRejectedValueOnce(new Error('WebNN unsupported op in act head'))
      .mockResolvedValueOnce(actModel);

    const mainBytes = new Uint8Array([1, 2, 3]);
    const actBytes = new Uint8Array([4, 5, 6]);

    const runner = await LayaModelRunner.load(mainBytes, actBytes, {
      window: 256,
      hidden: 768,
      padId: 0,
      inputMode: LayaGraphInputMode.TOKEN_IDS,
      accelerator: 'webnn',
      webNNOptions: { devicePreference: 'npu' },
    });

    expect(loadAndCompileMock).toHaveBeenCalledTimes(3);
    expect(loadAndCompileMock).toHaveBeenNthCalledWith(3, actBytes, {
      accelerator: 'wasm',
    });
    expect(mainModel.delete).not.toHaveBeenCalled();
    runner.delete();
  });
});
