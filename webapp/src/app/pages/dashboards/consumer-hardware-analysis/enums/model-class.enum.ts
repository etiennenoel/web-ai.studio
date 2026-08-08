/**
 * The eight model sizes the dashboard shows. Three of them share one source column:
 * the file measures 1–4B as a single bucket, and the fit shows that bucket behaves like
 * a 4B model, so 1B and 2B follow from the same law rather than from their own figures.
 */
export enum ModelClassEnum {
  Tiny = 'tiny',
  Nano1B = 'nano-1b',
  Nano2B = 'nano-2b',
  Nano4B = 'nano-4b',
  Light = 'light',
  Mid = 'mid',
  Large = 'large',
  Xl = 'xl',

  /** Speech models, by the Whisper size they are named for. */
  WhisperTiny = 'whisper-tiny',
  WhisperBase = 'whisper-base',
  WhisperSmall = 'whisper-small',
  WhisperMedium = 'whisper-medium',
  WhisperLarge = 'whisper-large',
}
