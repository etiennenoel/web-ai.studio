/** How the main graph receives tokens. */
export enum LayaGraphInputMode {
  /** `input_ids [1,N] int32`; the embedding table is inside the graph. */
  TOKEN_IDS = 'token_ids',
  /** `inputs_embeds [1,N,D] float32`; the host gathers rows from an external table. */
  INPUTS_EMBEDS = 'inputs_embeds',
}
