import { LayaQuestionType } from './laya-question-type.enum';
import { LAYA_QUESTION_TYPE_INDEX } from './laya-question-type-index.const';
import { LayaCalibration } from './laya-calibration.interface';
import { LayaAnswer } from './laya-answer.interface';

const ENTROPY_FLOOR = 1e-9;
const CONFIDENCE_FLOOR = 1e-12;
const MIN_TEMPERATURE = 1e-3;

/**
 * Port of the Laya NumPy reference decoder (HOST_CONTRACT.md section D).
 * All arithmetic is done in doubles; the reference uses float32.
 */
export class LayaDecoder {
  static softmax(values: ArrayLike<number>): number[] {
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) max = Math.max(max, values[i]);
    const exps: number[] = [];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      const e = Math.exp(values[i] - max);
      exps.push(e);
      sum += e;
    }
    return exps.map((e) => e / sum);
  }

  static gatherMarkers(tokenLogits: ArrayLike<number>, markers: number[]): number[] {
    return markers.map((m) => tokenLogits[m]);
  }

  /** Four act-head features from the raw (uncalibrated) marker logits. */
  static actFeatures(rawLogits: number[]): Float32Array {
    const p = LayaDecoder.softmax(rawLogits);
    const k = Math.max(p.length, 2);
    const sorted = [...p].sort((a, b) => b - a);
    const top1 = sorted[0];
    const top2 = sorted.length > 1 ? sorted[1] : 0;
    let entropy = 0;
    for (const v of p) entropy -= v * Math.log(Math.max(v, ENTROPY_FLOOR));
    entropy /= Math.log(k);
    return new Float32Array([top1, top1 - top2, entropy, k / 255]);
  }

  static temperatureBucket(type: LayaQuestionType, k: number): string {
    const size = k <= 2 ? '2' : k <= 5 ? '3-5' : k <= 10 ? '6-10' : '11+';
    return `${type}:${size}`;
  }

  static temperatureFor(type: LayaQuestionType, k: number, calibration: LayaCalibration): number {
    const bucketed = calibration.temperature_by_options?.[LayaDecoder.temperatureBucket(type, k)];
    if (bucketed !== undefined) return bucketed;
    return calibration.temperature?.[LAYA_QUESTION_TYPE_INDEX[type]] ?? 1;
  }

  static calibratedProbabilities(
    rawLogits: number[],
    type: LayaQuestionType,
    calibration: LayaCalibration,
  ): number[] {
    const scale = Math.max(MIN_TEMPERATURE, LayaDecoder.temperatureFor(type, rawLogits.length, calibration));
    return LayaDecoder.softmax(rawLogits.map((z) => z / scale));
  }

  /** Normalized Shannon entropy confidence `1 - H(p) / log(K)` clipped to [0, 1]. */
  static confidence(p: number[]): number {
    const k = p.length;
    if (k < 2) return 1;
    let entropy = 0;
    for (const v of p) entropy -= v * Math.log(Math.min(1, Math.max(v, CONFIDENCE_FLOOR)));
    return Math.min(1, Math.max(0, 1 - entropy / Math.log(k)));
  }

  static argmax(p: number[]): number {
    let best = 0;
    for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    return best;
  }

  static decode(
    rawLogits: number[],
    actLogits: ArrayLike<number>,
    type: LayaQuestionType,
    calibration: LayaCalibration,
    inputTokens: number,
  ): LayaAnswer {
    const p = LayaDecoder.calibratedProbabilities(rawLogits, type, calibration);
    const actProbability = LayaDecoder.softmax(actLogits)[0];
    const argmaxIndex = LayaDecoder.argmax(p);

    if (type === LayaQuestionType.NOUL) {
      const pTrue = p[1];
      return {
        type,
        probabilities: p,
        argmaxIndex,
        confidence: Math.max(pTrue, 1 - pTrue),
        actProbability,
        inputTokens,
      };
    }

    const answer: LayaAnswer = {
      type,
      probabilities: p,
      argmaxIndex,
      confidence: LayaDecoder.confidence(p),
      actProbability,
      inputTokens,
    };
    if (type === LayaQuestionType.SCORE) {
      answer.expectedIndex = p.reduce((acc, v, i) => acc + i * v, 0);
    }
    return answer;
  }
}
