/**
 * The kind of machine a reader would actually buy. This is the vocabulary the hero and
 * the forecasts share — broader than a hardware segment, and narrower than a product
 * name.
 */
export enum ConsumerTypeEnum {
  MainstreamLaptop = 'mainstream-laptop',
  ProLaptop = 'pro-laptop',
  MidRangeGraphicsCard = 'mid-range-graphics-card',
  FlagshipGraphicsCard = 'flagship-graphics-card',
  MiniAiDesktop = 'mini-ai-desktop',
  AppleDesktop = 'apple-desktop',
  DesktopCpu = 'desktop-cpu',
  BoardOrPhone = 'board-or-phone',
}
