import {
  CONTEXT_STEPS,
  DEFAULT_CONTEXT_TOKENS,
  DEFAULT_REALISED_BANDWIDTH,
  DEFAULT_TOKEN_OVERHEAD_MS,
} from '../constants/throughput-model.constant';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';
import {ModelClassInterface} from '../interfaces/model-class.interface';

/**
 * Turns the source's headline figures into what a machine would actually do.
 *
 * Two losses sit between a spec sheet and a real answer, and the source bundles both
 * into one number:
 *
 *  1. **Realised bandwidth.** No machine hits its rated peak.
 *  2. **Fixed cost per token.** Dispatch, sampling and attention do not shrink when the
 *     model does — which is why a 4B model runs at much the same speed on an 819 GB/s
 *     workstation as on a 120 GB/s laptop chip.
 *
 * On top of those, a real conversation holds a KV cache, and reading it is extra bytes
 * moved per token, so throughput falls in proportion.
 *
 * A figure is converted back into a streaming time at the machine's realised bandwidth,
 * charged for the cache, then charged the fixed overhead. The source's own bundled
 * efficiency is divided out rather than applied twice.
 */
export class ThroughputModel {

  contextTokens = DEFAULT_CONTEXT_TOKENS;

  realisedBandwidth: Record<HardwareSegmentEnum, number> = {...DEFAULT_REALISED_BANDWIDTH};

  overheadMsPerToken: Record<HardwareSegmentEnum, number> = {...DEFAULT_TOKEN_OVERHEAD_MS};

  /** KV cache held at the current context, in GB. */
  contextGb(modelClass: ModelClassInterface): number {
    return this.contextTokens * modelClass.kvCacheKbPerToken / 1048576;
  }

  /**
   * Memory a machine needs to run this size at the current context: weights plus cache,
   * never below the allowance the source itself assumes.
   */
  memoryNeededGb(modelClass: ModelClassInterface): number {
    return Math.max(modelClass.memoryNeededGb, modelClass.quantisedWeightsGb + this.contextGb(modelClass));
  }

  /** What fraction of its no-context throughput a size keeps once the cache is charged. */
  contextRetention(modelClass: ModelClassInterface): number {
    const weights = modelClass.quantisedWeightsGb;
    return weights / (weights + this.contextGb(modelClass));
  }

  /** The share of throughput the cache costs, as a percentage. */
  contextCostPercent(modelClass: ModelClassInterface): number {
    return Math.round((1 - this.contextRetention(modelClass)) * 100);
  }

  /**
   * Milliseconds spent streaming weights and cache for one token, at this machine's
   * realised bandwidth. `sourceEfficiency` is the bundled loss already inside the
   * published figure, divided back out here.
   */
  streamMilliseconds(tokensPerSecond: number,
                     modelClass: ModelClassInterface,
                     segment: HardwareSegmentEnum,
                     sourceEfficiency: number): number {
    const weights = modelClass.quantisedWeightsGb;
    const withCache = weights + this.contextGb(modelClass);
    return 1000 * sourceEfficiency / (tokensPerSecond * this.realisedBandwidth[segment]) * withCache / weights;
  }

  /**
   * The figure a reader should expect. Sub-billion models are measured rather than
   * modelled and already carry their own overhead, so they are only charged the cache.
   */
  adjust(tokensPerSecond: number,
         modelClass: ModelClassInterface,
         segment: HardwareSegmentEnum,
         sourceEfficiency: number): number {
    if (!modelClass.followsBandwidthLaw) {
      return tokensPerSecond * this.contextRetention(modelClass);
    }
    const streaming = this.streamMilliseconds(tokensPerSecond, modelClass, segment, sourceEfficiency);
    return 1000 / (streaming + this.overheadMsPerToken[segment]);
  }

  /** "4K", "512", or "no" when the cache is switched off. */
  get contextLabel(): string {
    if (this.contextTokens === 0) {
      return 'no';
    }
    return this.contextTokens >= 1024 ? `${this.contextTokens / 1024}K` : String(this.contextTokens);
  }

  get contextStepIndex(): number {
    return Math.max(0, CONTEXT_STEPS.indexOf(this.contextTokens));
  }

  setContextStep(index: number) {
    this.contextTokens = CONTEXT_STEPS[Math.min(Math.max(index, 0), CONTEXT_STEPS.length - 1)];
  }

  /** True once the reader has moved either loss away from its default. */
  get isTuned(): boolean {
    return Object.values(HardwareSegmentEnum).some(segment =>
      this.realisedBandwidth[segment] !== DEFAULT_REALISED_BANDWIDTH[segment]
      || this.overheadMsPerToken[segment] !== DEFAULT_TOKEN_OVERHEAD_MS[segment]);
  }

  reset() {
    this.contextTokens = DEFAULT_CONTEXT_TOKENS;
    this.realisedBandwidth = {...DEFAULT_REALISED_BANDWIDTH};
    this.overheadMsPerToken = {...DEFAULT_TOKEN_OVERHEAD_MS};
  }
}
