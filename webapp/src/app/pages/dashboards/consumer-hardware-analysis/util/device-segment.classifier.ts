import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';

/**
 * Sorts a machine into a segment from its maker and model name. The unified-memory
 * boxes count as CPUs with a very wide bus — that is exactly what they are — so they
 * are not a family of their own.
 */
export class DeviceSegmentClassifier {

  static classify(manufacturer: string, name: string): HardwareSegmentEnum {
    if (/raspberry pi/i.test(manufacturer) || /jetson|phone|pixel/i.test(name)) {
      return HardwareSegmentEnum.Edge;
    }
    if (/^(gtx|rtx|rx|arc)\b/i.test(name)) {
      return HardwareSegmentEnum.DiscreteGpu;
    }
    if (/^apple$/i.test(manufacturer) && /^M\d/.test(name)) {
      return HardwareSegmentEnum.AppleSoc;
    }
    return HardwareSegmentEnum.CpuIntegrated;
  }
}
