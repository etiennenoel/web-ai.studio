import { LayaTokenizer } from './laya-tokenizer';
import { LayaQuestion } from './laya-question.interface';
import { LayaSequence } from './laya-sequence.interface';
import { LayaOptionRenderer } from './laya-option.renderer';

const OPTION_MAX_TOKENS = 48;
const MIN_OPTION_BUDGET = 16;
const MIN_HEAD_TOKENS = 8;
const MIN_TOKENS_PER_OPTION = 4;

/**
 * Port of laya 0.3.4 `build_sequence` (see HOST_CONTRACT.md section B).
 *
 * Format: `[CLS] <type> question: <instructions> [SEP] [MASK] opt0 [MASK] opt1 ... [SEP] <state> [SEP]`
 */
export class LayaSequenceBuilder {
  constructor(
    private readonly tokenizer: LayaTokenizer,
    private readonly maxLen: number,
    private readonly headMaxLen: number,
  ) {}

  /** Builds the head only (everything before the state). Used for context usage and room. */
  buildHead(question: LayaQuestion): LayaSequence {
    const tk = this.tokenizer;
    const optionTexts = LayaOptionRenderer.render(question);
    const instructions = this.replaceMask(String(question.instructions));

    let headIds = tk.encode(`${question.type} question: ${instructions}`);
    let optionIds = optionTexts.map((text) => [
      tk.maskId,
      ...tk.encode(' ' + this.replaceMask(text)).slice(0, OPTION_MAX_TOKENS),
    ]);

    let optionBudget = this.headMaxLen - this.sumLengths(optionIds);
    if (optionBudget < MIN_OPTION_BUDGET) {
      const per = Math.max(
        MIN_TOKENS_PER_OPTION,
        Math.floor((this.headMaxLen - MIN_OPTION_BUDGET) / Math.max(1, optionIds.length)),
      );
      optionIds = optionIds.map((o) => o.slice(0, per));
      optionBudget = this.headMaxLen - this.sumLengths(optionIds);
    }
    headIds = headIds.slice(0, Math.max(MIN_HEAD_TOKENS, optionBudget));

    const ids: number[] = [tk.clsId, ...headIds, tk.sepId];
    const markers: number[] = [];
    for (const option of optionIds) {
      markers.push(ids.length);
      ids.push(...option);
    }
    ids.push(tk.sepId);
    return { ids, markers };
  }

  /** Number of state tokens that fit after the given head. */
  roomFor(head: LayaSequence): number {
    return Math.max(0, this.maxLen - head.ids.length - 1);
  }

  /** Encodes a serialized state without special tokens (mask tokens replaced by spaces). */
  encodeState(state: string): number[] {
    return this.tokenizer.encode(this.replaceMask(state));
  }

  /** Builds the full sequence; the state is right-truncated to the available room. */
  build(state: string, question: LayaQuestion): LayaSequence {
    const head = this.buildHead(question);
    const room = this.roomFor(head);
    const stateIds = this.encodeState(state).slice(0, room);
    const ids = [...head.ids, ...stateIds, this.tokenizer.sepId].slice(0, this.maxLen);
    const markers = head.markers.filter((m) => m < this.maxLen);
    return { ids, markers };
  }

  private replaceMask(text: string): string {
    return text.split(this.tokenizer.maskToken).join(' ');
  }

  private sumLengths(lists: number[][]): number {
    return lists.reduce((acc, list) => acc + list.length, 0);
  }
}
