import {MODEL_CLASS_BY_KEY} from '../constants/model-classes.constant';
import {
  DEFAULT_REALISED_BANDWIDTH,
  DEFAULT_TOKEN_OVERHEAD_MS,
} from '../constants/throughput-model.constant';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {ModelClassEnum} from '../enums/model-class.enum';
import {ThroughputModel} from './throughput-model';

describe('ThroughputModel', () => {

  let model: ThroughputModel;

  const light = MODEL_CLASS_BY_KEY[ModelClassEnum.Light];
  const nano1b = MODEL_CLASS_BY_KEY[ModelClassEnum.Nano1B];
  const nano4b = MODEL_CLASS_BY_KEY[ModelClassEnum.Nano4B];
  const tiny = MODEL_CLASS_BY_KEY[ModelClassEnum.Tiny];
  const gpu = HardwareSegmentEnum.DiscreteGpu;
  const laptop = HardwareSegmentEnum.CpuIntegrated;

  /** The bundled loss inside the source's own figures, as the fits report it. */
  const SOURCE_EFFICIENCY = 0.5488;
  const NANO_EFFICIENCY = 0.5994;

  beforeEach(() => model = new ThroughputModel());

  it('charges no cache at all at zero context', () => {
    model.contextTokens = 0;

    expect(model.contextGb(light)).toBe(0);
    expect(model.contextRetention(light)).toBe(1);
    expect(model.memoryNeededGb(light)).toBe(light.memoryNeededGb);
  });

  it('grows the cache with the context', () => {
    model.contextTokens = 4096;
    // 4096 tokens × 128 KB = 512 MB
    expect(model.contextGb(light)).toBeCloseTo(0.5, 3);

    model.contextTokens = 8192;
    expect(model.contextGb(light)).toBeCloseTo(1.0, 3);
  });

  it('raises the memory requirement once the cache outgrows the source allowance', () => {
    model.contextTokens = 4096;
    // 4.7 GB weights + 0.5 GB cache is still under the source's own 6 GB allowance
    expect(model.memoryNeededGb(light)).toBe(6);

    model.contextTokens = 32768;
    // 4.7 + 4 GB clears it, so the requirement follows the cache
    expect(model.memoryNeededGb(light)).toBeCloseTo(8.7, 3);
  });

  it('costs a small model proportionally more than a large one', () => {
    model.contextTokens = 4096;

    // The cache is a bigger share of a 1B model's bytes than of a 70B model's.
    expect(model.contextCostPercent(nano1b)).toBeGreaterThan(model.contextCostPercent(light));
  });

  describe('the two losses', () => {

    it('is bounded by the fixed overhead, however fast the bus', () => {
      // A machine with 2 ms of overhead can never exceed 500 tok/s, even on a figure
      // that claims thousands.
      const absurd = model.adjust(100000, light, gpu, SOURCE_EFFICIENCY);

      expect(absurd).toBeLessThan(1000 / DEFAULT_TOKEN_OVERHEAD_MS[gpu]);
      expect(absurd).toBeGreaterThan(400);
    });

    it('hurts a fast figure more than a slow one, because overhead does not shrink', () => {
      model.contextTokens = 0;

      // The same machine on a 1B model and on a 4B model: the source's own law says the
      // smaller one streams four times faster, so the fixed cost is a far larger share of
      // its token. Keeping less of a bigger number is exactly what a multiplicative
      // efficiency cannot reproduce.
      const smallKept = model.adjust(800, nano1b, laptop, NANO_EFFICIENCY) / 800;
      const largeKept = model.adjust(200, nano4b, laptop, NANO_EFFICIENCY) / 200;

      expect(smallKept).toBeLessThan(largeKept);
    });

    it('does not hand a four-times-faster bus four times the tokens', () => {
      model.contextTokens = 0;

      const slower = model.adjust(200, light, laptop, SOURCE_EFFICIENCY);
      const faster = model.adjust(800, light, laptop, SOURCE_EFFICIENCY);

      // Four times the streaming speed, nowhere near four times the answer.
      expect(faster / slower).toBeLessThan(2.5);
      expect(faster).toBeGreaterThan(slower);
    });

    it('rewards a machine that realises more of its peak', () => {
      const slow = model.adjust(100, light, gpu, SOURCE_EFFICIENCY);
      model.realisedBandwidth[gpu] = 1;
      const fast = model.adjust(100, light, gpu, SOURCE_EFFICIENCY);

      expect(fast).toBeGreaterThan(slow);
    });

    it('only charges the cache to a size the law does not describe', () => {
      model.contextTokens = 4096;

      // Tiny is measured and already carries its own overhead, so it is charged the
      // cache and nothing else.
      expect(model.adjust(40, tiny, laptop, 0.09)).toBeCloseTo(40 * model.contextRetention(tiny), 6);
    });

    it('splits a token into streaming plus overhead', () => {
      const streaming = model.streamMilliseconds(100, light, gpu, SOURCE_EFFICIENCY);
      const adjusted = model.adjust(100, light, gpu, SOURCE_EFFICIENCY);

      expect(1000 / adjusted).toBeCloseTo(streaming + DEFAULT_TOKEN_OVERHEAD_MS[gpu], 6);
    });
  });

  it('labels the context the way the controls read it', () => {
    model.contextTokens = 0;
    expect(model.contextLabel).toBe('no');

    model.contextTokens = 4096;
    expect(model.contextLabel).toBe('4K');

    model.contextTokens = 512;
    expect(model.contextLabel).toBe('512');
  });

  it('reports whether the reader has moved either loss, and restores them', () => {
    expect(model.isTuned).toBeFalse();

    model.overheadMsPerToken[gpu] = 25;
    expect(model.isTuned).toBeTrue();

    model.reset();
    expect(model.isTuned).toBeFalse();
    expect(model.overheadMsPerToken[gpu]).toBe(DEFAULT_TOKEN_OVERHEAD_MS[gpu]);
    expect(model.realisedBandwidth[gpu]).toBe(DEFAULT_REALISED_BANDWIDTH[gpu]);
    expect(model.contextTokens).toBe(4096);
  });
});
