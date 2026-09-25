import { describe, expect, it } from 'vitest';
import { LayaDecoder } from './laya-decoder';
import { LayaQuestionType } from './laya-question-type.enum';
import { LayaCalibration } from './laya-calibration.interface';

// Reference rows from HOST_CONTRACT.md section E.
const EN_CALIBRATION: LayaCalibration = {
  temperature: [1.6369030475616455, 1.2514300346374512, 1.983399510383606],
  temperature_by_options: {
    'choice:3-5': 1.7601518630981445,
    'choice:6-10': 1.0000158548355103,
    'score:3-5': 1.2514300346374512,
    'noul:2': 1.983399510383606,
    'choice:11+': 0.10058280825614929,
    'choice:2': 1.9063563346862793,
  },
};

const ML_CALIBRATION: LayaCalibration = {
  temperature: [2.042901414492613, 3.684653192472766, 3.629100511692587],
  temperature_by_options: {
    'choice:2': 1.397546128996061,
    'choice:3-5': 1.3591985667953796,
    'choice:6-10': 1.0,
    'choice:11+': 2.445877143176841,
    'score:3-5': 3.684653192472766,
    'noul:2': 3.629100511692587,
  },
};

describe('LayaDecoder', () => {
  it('reproduces the English A01/department reference row', () => {
    const raw = [1.0703915357589722, -1.8068784475326538, -2.2441372871398926, -2.46530818939209];
    const act = [3710.220947265625, -3030.86669921875];

    const answer = LayaDecoder.decode(raw, act, LayaQuestionType.CHOICE, EN_CALIBRATION, 73);

    const expected = [0.6750863194465637, 0.13165292143821716, 0.10269340872764587, 0.09056732803583145];
    answer.probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 5));
    expect(answer.argmaxIndex).toBe(0);
    expect(answer.confidence).toBeCloseTo(0.2906, 4);
    expect(answer.actProbability).toBeCloseTo(1.0, 4);

    const feats = LayaDecoder.actFeatures(raw);
    const expectedFeats = [0.8914421796798706, 0.8412644863128662, 0.3307645320892334, 0.01568627543747425];
    expectedFeats.forEach((f, i) => expect(feats[i]).toBeCloseTo(f, 5));
  });

  it('reproduces the multilingual ML_A04/department reference row with shipped calibration', () => {
    const raw = [7.643063545227051, -4.5210771560668945, 0.46446093916893005, -3.5530107021331787];
    const act = [1316.4495849609375, -1573.5196533203125];

    const answer = LayaDecoder.decode(raw, act, LayaQuestionType.CHOICE, ML_CALIBRATION, 77);

    const expected = [0.9945505261421204, 0.00012909529323223978, 0.005057105794548988, 0.0002631658280733973];
    answer.probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 5));
    expect(answer.confidence).toBeCloseTo(0.9744, 4);

    const feats = LayaDecoder.actFeatures(raw);
    expect(feats[0]).toBeCloseTo(0.9992189407348633, 5);
    expect(feats[1]).toBeCloseTo(0.9984567761421204, 5);
    expect(feats[2]).toBeCloseTo(0.004666685126721859, 5);
  });

  it('uses the per-type fallback temperature when no bucket matches', () => {
    expect(LayaDecoder.temperatureFor(LayaQuestionType.SCORE, 7, EN_CALIBRATION)).toBe(1.2514300346374512);
    expect(LayaDecoder.temperatureBucket(LayaQuestionType.CHOICE, 11)).toBe('choice:11+');
    expect(LayaDecoder.temperatureBucket(LayaQuestionType.NOUL, 2)).toBe('noul:2');
  });

  it('returns the expected level index and noul confidence', () => {
    const score = LayaDecoder.decode([0, 0, 10], [0, 0], LayaQuestionType.SCORE, { temperature: [1, 1, 1] }, 5);
    expect(score.expectedIndex).toBeCloseTo(2, 3);
    expect(score.argmaxIndex).toBe(2);

    const noul = LayaDecoder.decode([0, Math.log(3)], [0, 0], LayaQuestionType.NOUL, { temperature: [1, 1, 1] }, 5);
    expect(noul.probabilities[1]).toBeCloseTo(0.75, 6);
    expect(noul.confidence).toBeCloseTo(0.75, 6);
  });
});
