import { LayaTokenizer } from './laya-tokenizer';
import { LayaSequenceBuilder } from './laya-sequence.builder';
import { LayaModelRunner } from './laya-model-runner';
import { LayaCalibration } from './laya-calibration.interface';
import { LayaQuestion } from './laya-question.interface';
import { LayaAnswer } from './laya-answer.interface';
import { LayaDecoder } from './laya-decoder';
import { LayaOptionRenderer } from './laya-option.renderer';
import { LAYA_QUESTION_TYPE_INDEX } from './laya-question-type-index.const';

/**
 * Executable form of HOST_CONTRACT.md sections B and D: builds one row per
 * question, runs both graphs, and decodes calibrated probabilities.
 * Graph calls are serialized; LiteRT.js models are not reentrant.
 */
export class LayaHost {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly tokenizer: LayaTokenizer,
    readonly builder: LayaSequenceBuilder,
    private readonly runner: LayaModelRunner,
    private readonly calibration: LayaCalibration,
    readonly window: number,
  ) {}

  /** Token count of the question head (everything except the state). */
  measureHead(question: LayaQuestion): number {
    return this.builder.buildHead(question).ids.length;
  }

  /** Token count of a serialized state, before truncation. */
  measureState(state: string): number {
    return this.builder.encodeState(state).length;
  }

  /** Number of state tokens that fit for the question without truncation. */
  stateRoom(question: LayaQuestion): number {
    return this.builder.roomFor(this.builder.buildHead(question));
  }

  /** Throws when the options do not all fit in the head budget (upstream `Agent.system_one` rule). */
  assertOptionsFit(question: LayaQuestion): void {
    const head = this.builder.buildHead(question);
    const expected = LayaOptionRenderer.render(question).length;
    if (head.markers.length !== expected) {
      throw new Error(`question options exceed head_max_len`);
    }
  }

  async predict(state: string, question: LayaQuestion): Promise<LayaAnswer> {
    const run = this.queue.then(() => this.predictUnlocked(state, question));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async predictUnlocked(state: string, question: LayaQuestion): Promise<LayaAnswer> {
    const { ids, markers } = this.builder.build(state, question);
    const expected = LayaOptionRenderer.render(question).length;
    if (markers.length !== expected) {
      throw new Error(`question options exceed head_max_len`);
    }
    const qtypeIndex = LAYA_QUESTION_TYPE_INDEX[question.type];
    const main = await this.runner.runMain(ids, qtypeIndex);
    const raw = LayaDecoder.gatherMarkers(main.tokenLogits, markers);
    const actLogits = await this.runner.runAct(main.pooledCls, LayaDecoder.actFeatures(raw));
    return LayaDecoder.decode(raw, actLogits, question.type, this.calibration, ids.length);
  }

  delete(): void {
    this.runner.delete();
  }
}
