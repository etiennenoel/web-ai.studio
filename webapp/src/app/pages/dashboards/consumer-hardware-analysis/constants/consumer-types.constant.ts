import {ConsumerTypeEnum} from '../enums/consumer-type.enum';

/** Cheapest and slowest first, so the hero grid reads as a ladder. */
export const CONSUMER_TYPE_ORDER: ConsumerTypeEnum[] = [
  ConsumerTypeEnum.MainstreamLaptop,
  ConsumerTypeEnum.ProLaptop,
  ConsumerTypeEnum.MidRangeGraphicsCard,
  ConsumerTypeEnum.FlagshipGraphicsCard,
  ConsumerTypeEnum.MiniAiDesktop,
  ConsumerTypeEnum.AppleDesktop,
  ConsumerTypeEnum.DesktopCpu,
  ConsumerTypeEnum.BoardOrPhone,
];

export const CONSUMER_TYPE_LABELS: Record<ConsumerTypeEnum, string> = {
  [ConsumerTypeEnum.MainstreamLaptop]: 'Mainstream laptop',
  [ConsumerTypeEnum.ProLaptop]: 'Pro laptop',
  [ConsumerTypeEnum.MidRangeGraphicsCard]: 'Mid-range graphics card',
  [ConsumerTypeEnum.FlagshipGraphicsCard]: 'Flagship graphics card',
  [ConsumerTypeEnum.MiniAiDesktop]: 'Mini AI desktop',
  [ConsumerTypeEnum.AppleDesktop]: 'Apple desktop',
  [ConsumerTypeEnum.DesktopCpu]: 'Desktop CPU',
  [ConsumerTypeEnum.BoardOrPhone]: 'Board or phone',
};

export const CONSUMER_TYPE_BLURBS: Record<ConsumerTypeEnum, string> = {
  [ConsumerTypeEnum.MainstreamLaptop]: 'thin-and-light chips using system memory',
  [ConsumerTypeEnum.ProLaptop]: 'Apple Pro and Max silicon',
  [ConsumerTypeEnum.MidRangeGraphicsCard]: '60- and 70-class cards, 8–16 GB',
  [ConsumerTypeEnum.FlagshipGraphicsCard]: '80- and 90-class cards, the fastest memory sold',
  [ConsumerTypeEnum.MiniAiDesktop]: 'small boxes built around one big memory pool',
  [ConsumerTypeEnum.AppleDesktop]: 'Ultra silicon, one huge memory pool',
  [ConsumerTypeEnum.DesktopCpu]: 'system RAM doing the work, no usable GPU',
  [ConsumerTypeEnum.BoardOrPhone]: 'single-board computers and handsets',
};
