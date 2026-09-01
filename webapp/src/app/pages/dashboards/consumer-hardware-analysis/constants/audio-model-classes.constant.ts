import {ModelClassEnum} from '../enums/model-class.enum';
import {ModelClassInterface} from '../interfaces/model-class.interface';

/**
 * Whisper-family sizes, smallest first.
 *
 * `quantisedWeightsGb` is the *decoder* at 4-bit — the only part that streams per token —
 * while `encoderParamsB` is the half that runs once per second of audio as dense matrix
 * multiplication. `memoryNeededGb` is the whole model, which is small enough that memory
 * capacity is essentially never the constraint here.
 *
 * None of these names a source column, because no column measures them: nothing in the
 * dataset was benchmarked on transcription. Every figure the page shows for speech is
 * modelled, and it says so.
 */
export const AUDIO_MODEL_CLASSES: ModelClassInterface[] = [
  {
    key: ModelClassEnum.WhisperTiny, name: 'Tiny', sizeLabel: '39M', exampleName: 'whisper-tiny',
    multiplier: 1,
    quantisedWeightsGb: 0.016, memoryNeededGb: 0.4, kvCacheKbPerToken: 2,
    encoderParamsB: 0.008, contextCapTokens: 448, followsBandwidthLaw: true,
  },
  {
    key: ModelClassEnum.WhisperBase, name: 'Base', sizeLabel: '74M', exampleName: 'whisper-base',
    multiplier: 1,
    quantisedWeightsGb: 0.027, memoryNeededGb: 0.5, kvCacheKbPerToken: 4,
    encoderParamsB: 0.020, contextCapTokens: 448, followsBandwidthLaw: true,
  },
  {
    key: ModelClassEnum.WhisperSmall, name: 'Small', sizeLabel: '244M', exampleName: 'whisper-small',
    multiplier: 1,
    quantisedWeightsGb: 0.078, memoryNeededGb: 0.7, kvCacheKbPerToken: 8,
    encoderParamsB: 0.088, contextCapTokens: 448, followsBandwidthLaw: true,
  },
  {
    key: ModelClassEnum.WhisperMedium, name: 'Medium', sizeLabel: '769M', exampleName: 'whisper-medium',
    multiplier: 1,
    quantisedWeightsGb: 0.23, memoryNeededGb: 1.2, kvCacheKbPerToken: 16,
    encoderParamsB: 0.306, contextCapTokens: 448, followsBandwidthLaw: true,
  },
  {
    key: ModelClassEnum.WhisperLarge, name: 'Large', sizeLabel: '1.5B', exampleName: 'whisper-large-v3',
    multiplier: 1,
    quantisedWeightsGb: 0.46, memoryNeededGb: 2, kvCacheKbPerToken: 24,
    encoderParamsB: 0.635, contextCapTokens: 448, followsBandwidthLaw: true,
  },
];
