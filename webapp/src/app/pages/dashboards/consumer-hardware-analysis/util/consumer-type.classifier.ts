import {ConsumerTypeEnum} from '../enums/consumer-type.enum';
import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';

/**
 * The 80- and 90-class cards, plus AMD's halo parts: the tier that ships the fastest
 * memory sold in a consumer machine. Everything else discrete counts as mid-range.
 */
const FLAGSHIP_CARDS = new Set([
  'GTX 1080 Ti', 'RTX 2080 Ti', 'RTX 3080', 'RTX 3090', 'RTX 4080', 'RTX 4090',
  'RTX 5080', 'RTX 5090', 'RX 6900 XT', 'RX 7900 XT', 'RX 7900 XTX',
]);

/** Sorts a machine into the kind of thing a reader would actually buy. */
export class ConsumerTypeClassifier {

  static classify(name: string, segment: HardwareSegmentEnum): ConsumerTypeEnum {
    if (segment === HardwareSegmentEnum.Edge) {
      return ConsumerTypeEnum.BoardOrPhone;
    }
    if (/^NVIDIA DGX Spark|^Ryzen AI Max\+/.test(name)) {
      return ConsumerTypeEnum.MiniAiDesktop;
    }
    if (/ Ultra$/.test(name)) {
      return ConsumerTypeEnum.AppleDesktop;
    }
    if (/^M\d+ (Pro|Max)$/.test(name)) {
      return ConsumerTypeEnum.ProLaptop;
    }
    if (segment === HardwareSegmentEnum.DiscreteGpu) {
      return FLAGSHIP_CARDS.has(name)
        ? ConsumerTypeEnum.FlagshipGraphicsCard
        : ConsumerTypeEnum.MidRangeGraphicsCard;
    }
    // An Intel-era iMac is a desktop CPU with a screen attached: no usable GPU for this.
    if (/9950X|Arrow Lake/.test(name) || name.startsWith('iMac')) {
      return ConsumerTypeEnum.DesktopCpu;
    }
    return ConsumerTypeEnum.MainstreamLaptop;
  }
}
