import {ModelClassEnum} from '../enums/model-class.enum';
import {SourceColumnEnum} from '../enums/source-column.enum';

/** A model size as shown to the reader, and what it costs to run one. */
export interface ModelClassInterface {
  key: ModelClassEnum;

  name: string;

  /** Parameter range the size covers, e.g. "7–9B". */
  sizeLabel: string;

  /**
   * Which column of the source this size reads from. Absent when no column measures it —
   * nothing in the file was benchmarked on transcription — in which case every figure the
   * page shows for the size is modelled.
   */
  sourceColumn?: SourceColumnEnum;

  /**
   * How the source figure scales to this size. 1 means the column *is* this size; 2 and
   * 4 mean half and a quarter of the weights, so twice and four times the tokens. Only
   * a multiplier of 1 counts as measured.
   */
  multiplier: number;

  /** Weights at 4-bit quantisation, in GB — the bytes a decode step must move. */
  quantisedWeightsGb: number;

  /**
   * The source's own memory allowance for this size, in GB. It acts as a floor: the
   * requirement the page actually applies is this or weights-plus-KV-cache, whichever is
   * larger, and the cache grows with the context the reader chooses.
   */
  memoryNeededGb: number;

  /**
   * KV cache read per generated token, per token of context, in KB. FP16 with
   * grouped-query attention: roughly 2 · layers · kv_heads · head_dim · 2 bytes.
   */
  kvCacheKbPerToken: number;

  /**
   * False for the sub-billion size, which leaves most of the memory bus idle and so is
   * bound by the engine rather than by bandwidth. Its throughput is reported where the
   * source measured it and never modelled or projected from bandwidth.
   */
  followsBandwidthLaw: boolean;

  /**
   * Encoder parameters in billions, for a speech model. The encoder runs once over a fixed
   * number of frames per second of audio and never generates a token, so it is compute-bound
   * rather than memory-bound — the half of transcription the bandwidth law does not describe.
   * Absent on a text size.
   */
  encoderParamsB?: number;

  /**
   * The model's own context window, in tokens. A speech model's cache cannot grow past the
   * 30-second slice it works in, however wide a context the reader asks for.
   */
  contextCapTokens?: number;

  /** A model a reader would recognise at this size. */
  exampleName?: string;
}
