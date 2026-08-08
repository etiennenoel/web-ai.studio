/** What the reader is asking the hardware to do. */
export enum TaskModeEnum {
  /** Generating text: one memory-bound decode step per token. */
  Text = 'text',
  /** Transcribing speech: a compute-bound encoder pass, then a short decode. */
  Audio = 'audio',
}
