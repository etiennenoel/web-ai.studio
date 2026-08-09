import {HardwareSegmentEnum} from '../enums/hardware-segment.enum';

/**
 * Text tokens a second of speech turns into. Speech runs at roughly 2.5 words a second,
 * so about three tokens — call it five once timestamps and beam search are counted.
 * Greedy decoding is nearer two.
 */
export const DEFAULT_TOKENS_PER_SECOND_OF_AUDIO = 5;

/**
 * The encoder is compute-bound and this dataset carries only bandwidth, so compute is
 * estimated as FLOP per byte of bandwidth. It is the one figure on the page not derived
 * from the data, and it is calibrated against published whisper-large throughput.
 */
export const DEFAULT_FLOP_PER_BYTE: Record<HardwareSegmentEnum, number> = {
  [HardwareSegmentEnum.DiscreteGpu]: 30,
  [HardwareSegmentEnum.AppleSoc]: 10,
  [HardwareSegmentEnum.CpuIntegrated]: 4,
  [HardwareSegmentEnum.Edge]: 2.5,
};

/** Encoder positions per second of audio: 3000 spectrogram frames per 30 seconds, halved twice. */
export const ENCODER_FRAMES_PER_SECOND = 50;

/** Bounds for the two speech figures, as the inputs enforce them. */
export const TOKENS_PER_SECOND_RANGE = {min: 1, max: 40, step: 0.5};
export const FLOP_PER_BYTE_RANGE = {min: 0.5, max: 200, step: 0.5};

/**
 * The share of realised bandwidth a decode step converts into tokens. The text classes
 * all settle near this, and no source measures a speech model, so the speech decoder
 * borrows it rather than inventing one.
 */
export const SPEECH_DECODER_EFFICIENCY = 0.57;
