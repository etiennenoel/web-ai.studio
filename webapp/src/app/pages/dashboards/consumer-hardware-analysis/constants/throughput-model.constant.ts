import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';

/** Context lengths the reader can pick, in tokens. Zero charges no cache at all. */
export const CONTEXT_STEPS = [0, 1024, 2048, 4096, 8192, 16384, 32768];

/** A working context, rather than the source's implicit near-zero one. */
export const DEFAULT_CONTEXT_TOKENS = 4096;

/**
 * How much of its rated peak a machine actually moves. Wide-parallel GPUs come close; a
 * laptop with two memory channels and a thermal budget does not, and CPU inference is
 * often dequantisation-bound rather than purely memory-bound.
 */
export const DEFAULT_REALISED_BANDWIDTH: Record<HardwareSegmentEnum, number> = {
  [HardwareSegmentEnum.DiscreteGpu]: 0.85,
  [HardwareSegmentEnum.AppleSoc]: 0.85,
  [HardwareSegmentEnum.CpuIntegrated]: 0.50,
  [HardwareSegmentEnum.Edge]: 0.45,
};

/**
 * Fixed cost per token, in milliseconds: everything that is not streaming weights —
 * dispatch, sampling, attention. It does not shrink when the model does, which is why a
 * 4B model runs at much the same speed on an 819 GB/s workstation as on a 120 GB/s
 * laptop chip: both spend most of the token elsewhere. A multiplicative efficiency
 * cannot reproduce that; a constant per-token cost can.
 */
export const DEFAULT_TOKEN_OVERHEAD_MS: Record<HardwareSegmentEnum, number> = {
  [HardwareSegmentEnum.DiscreteGpu]: 2,
  [HardwareSegmentEnum.AppleSoc]: 10,
  [HardwareSegmentEnum.CpuIntegrated]: 45,
  [HardwareSegmentEnum.Edge]: 80,
};

/** Bounds for the two tunable figures, as the inputs enforce them. */
export const REALISED_BANDWIDTH_RANGE = {min: 20, max: 100, step: 5};
export const TOKEN_OVERHEAD_RANGE = {min: 0, max: 300, step: 1};
