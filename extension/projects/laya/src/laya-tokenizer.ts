import { Tokenizer } from '@huggingface/tokenizers';

/**
 * Thin wrapper over tokenizers.js that encodes text fragments without
 * automatic special tokens and exposes the checkpoint's special token ids.
 *
 * The host contract requires `add_special_tokens=False` for every fragment;
 * CLS/SEP/MASK are inserted by the sequence builder.
 */
export class LayaTokenizer {
  readonly clsId: number;
  readonly sepId: number;
  readonly padId: number;
  readonly maskId: number;
  readonly maskToken: string;

  private readonly tokenizer: Tokenizer;

  constructor(tokenizerJson: object, tokenizerConfig: Record<string, unknown>) {
    this.tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig);
    this.maskToken = String(tokenizerConfig['mask_token']);
    this.clsId = this.requireId(String(tokenizerConfig['cls_token']));
    this.sepId = this.requireId(String(tokenizerConfig['sep_token']));
    this.padId = this.requireId(String(tokenizerConfig['pad_token']));
    this.maskId = this.requireId(this.maskToken);
  }

  /** Encodes a text fragment without special tokens. */
  encode(text: string): number[] {
    return this.tokenizer.encode(text, { add_special_tokens: false }).ids;
  }

  private requireId(token: string): number {
    const id = this.tokenizer.token_to_id(token);
    if (id === undefined) {
      throw new Error(`LayaTokenizer: special token "${token}" is not in the vocabulary`);
    }
    return id;
  }
}
