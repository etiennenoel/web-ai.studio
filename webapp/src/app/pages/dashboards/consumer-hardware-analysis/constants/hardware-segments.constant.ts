import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';

/** Segment order in the matrix, fastest-bus families first. */
export const HARDWARE_SEGMENT_ORDER: HardwareSegmentEnum[] = [
  HardwareSegmentEnum.DiscreteGpu,
  HardwareSegmentEnum.AppleSoc,
  HardwareSegmentEnum.CpuIntegrated,
  HardwareSegmentEnum.Edge,
];

export const HARDWARE_SEGMENT_LABELS: Record<HardwareSegmentEnum, string> = {
  [HardwareSegmentEnum.DiscreteGpu]: 'Graphics cards',
  [HardwareSegmentEnum.AppleSoc]: 'Apple silicon',
  [HardwareSegmentEnum.CpuIntegrated]: 'CPUs & integrated graphics',
  [HardwareSegmentEnum.Edge]: 'Boards & phones',
};

/** What makes each family's memory behave the way it does. */
export const HARDWARE_SEGMENT_BLURBS: Record<HardwareSegmentEnum, string> = {
  [HardwareSegmentEnum.DiscreteGpu]: 'fast memory, not much of it',
  [HardwareSegmentEnum.AppleSoc]: 'one memory pool for CPU and GPU',
  [HardwareSegmentEnum.CpuIntegrated]: 'system RAM doing the work',
  [HardwareSegmentEnum.Edge]: 'small, cheap, and patient',
};
