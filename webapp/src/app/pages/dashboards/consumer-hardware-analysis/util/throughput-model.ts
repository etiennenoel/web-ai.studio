import {
  DEFAULT_FLOP_PER_BYTE,
  DEFAULT_TOKENS_PER_SECOND_OF_AUDIO,
  ENCODER_FRAMES_PER_SECOND,
} from '../constants/speech-model.constant';
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

  /** Text tokens a second of speech turns into — the length of the decode half. */
  tokensPerSecondOfAudio = DEFAULT_TOKENS_PER_SECOND_OF_AUDIO;

  /** Compute per byte of bandwidth, the stand-in for the FLOPS this dataset does not carry. */
  flopPerByte: Record<HardwareSegmentEnum, number> = {...DEFAULT_FLOP_PER_BYTE};

  /**
   * KV cache held at the current context, in GB. A model's own window is the ceiling: a
   * speech model works in 30-second slices and cannot hold a 32K conversation whatever
   * context the reader asks for.
   */
  contextGb(modelClass: ModelClassInterface): number {
    const tokens = Math.min(this.contextTokens, modelClass.contextCapTokens ?? this.contextTokens);
    return tokens * modelClass.kvCacheKbPerToken / 1048576;
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

  /**
   * Effective compute, in GFLOP/s, estimated from the memory bandwidth this dataset does
   * carry. It is the one figure on the page derived from neither the file nor the fit.
   */
  effectiveGflops(segment: HardwareSegmentEnum, bandwidthGbps: number): number {
    return bandwidthGbps * this.realisedBandwidth[segment] * this.flopPerByte[segment];
  }

  /**
   * Milliseconds the encoder spends on one second of audio. It runs once over a fixed
   * number of frames, in a single forward pass, so it costs the same whatever the machine
   * is doing afterwards — and nothing about it depends on memory bandwidth.
   */
  encoderMilliseconds(modelClass: ModelClassInterface,
                      segment: HardwareSegmentEnum,
                      bandwidthGbps: number): number {
    const gflops = this.effectiveGflops(segment, bandwidthGbps);
    if (gflops <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    // two floating-point operations per parameter per position
    return 2 * (modelClass.encoderParamsB ?? 0) * ENCODER_FRAMES_PER_SECOND / gflops * 1000;
  }

  /** Milliseconds the decoder spends on one second of audio, at a given token rate. */
  decoderMilliseconds(tokensPerSecond: number): number {
    return tokensPerSecond > 0
      ? this.tokensPerSecondOfAudio / tokensPerSecond * 1000
      : Number.POSITIVE_INFINITY;
  }

  /**
   * How many times faster than the recording a machine transcribes: a compute-bound
   * encoder pass over one second of audio, then the handful of memory-bound decode steps
   * that second is worth. 1× keeps up with the speaker.
   */
  realtimeFactor(tokensPerSecond: number,
                 modelClass: ModelClassInterface,
                 segment: HardwareSegmentEnum,
                 sourceEfficiency: number,
                 bandwidthGbps: number): number {
    const decoding = this.decoderMilliseconds(
      this.adjust(tokensPerSecond, modelClass, segment, sourceEfficiency));
    return 1000 / (this.encoderMilliseconds(modelClass, segment, bandwidthGbps) + decoding);
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

  /** True once the reader has moved any of the losses away from its default. */
  get isTuned(): boolean {
    return this.tokensPerSecondOfAudio !== DEFAULT_TOKENS_PER_SECOND_OF_AUDIO
      || Object.values(HardwareSegmentEnum).some(segment =>
        this.realisedBandwidth[segment] !== DEFAULT_REALISED_BANDWIDTH[segment]
        || this.overheadMsPerToken[segment] !== DEFAULT_TOKEN_OVERHEAD_MS[segment]
        || this.flopPerByte[segment] !== DEFAULT_FLOP_PER_BYTE[segment]);
  }

  reset() {
    this.contextTokens = DEFAULT_CONTEXT_TOKENS;
    this.realisedBandwidth = {...DEFAULT_REALISED_BANDWIDTH};
    this.overheadMsPerToken = {...DEFAULT_TOKEN_OVERHEAD_MS};
    this.tokensPerSecondOfAudio = DEFAULT_TOKENS_PER_SECOND_OF_AUDIO;
    this.flopPerByte = {...DEFAULT_FLOP_PER_BYTE};
  }
}
