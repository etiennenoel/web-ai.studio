/**
 * What a token rate feels like to a user, in five ordered buckets. The matrix and the
 * arrival grid both encode magnitude with these, so they share one ordinal colour ramp.
 */
export enum SpeedBandEnum {
  Crawling = 'crawling',
  Slow = 'slow',
  Readable = 'readable',
  Conversational = 'conversational',
  Instant = 'instant',
}
