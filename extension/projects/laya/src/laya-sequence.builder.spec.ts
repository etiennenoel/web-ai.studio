import { beforeAll, describe, expect, it } from 'vitest';
import { LayaTokenizer } from './laya-tokenizer';
import { LayaSequenceBuilder } from './laya-sequence.builder';
import { LayaQuestion } from './laya-question.interface';
import { LayaQuestionType } from './laya-question-type.enum';
import { loadLayaTestAsset } from './laya-test-assets.helper';

// Reference rows from HOST_CONTRACT.md section E. The state is the Python
// `json.dumps(..., ensure_ascii=False)` text with default separators.
const DEPARTMENT_QUESTION: LayaQuestion = {
  type: LayaQuestionType.CHOICE,
  instructions: 'Which department should handle this request?',
  options: [
    { label: 'billing', description: 'invoices, payments, refunds' },
    { label: 'technical', description: 'bugs, outages, system errors' },
    { label: 'sales', description: 'pricing, new contracts' },
    { label: 'other', description: 'everything else' },
  ],
};

const EN_STATE = '{"from": "Velqun", "subject": "Duplicate charge", "body": "Please refund the duplicate charge."}';
const EN_IDS = [50281,22122,1953,27,6758,7811,943,6016,436,2748,32,50282,50284,33484,27,29838,1271,13,10762,13,1275,41748,50284,7681,27,19775,13,562,1131,13,985,6332,50284,6224,27,20910,13,747,12712,50284,643,27,3253,2010,50282,9819,4064,1381,346,37599,82,328,995,346,19091,1381,346,24900,21821,4179,995,346,2915,1381,346,7845,23005,253,21036,4179,449,94,50282];

const ML_STATE = '{"from": "連絡係", "subject": "二重請求", "body": "料金が二重に引き落とされています。差額を返金してください。"}';
const ML_IDS = [2,6241,2872,235292,12236,9888,1412,6589,736,3853,235336,1,4,54972,235292,88220,235269,15598,235269,85869,4,9838,235292,30608,235269,142788,235269,1812,10266,4,7108,235292,25063,235269,888,20078,4,1156,235292,4553,1354,1,19946,2273,1192,664,63090,236948,824,664,15029,1192,664,217491,133074,824,664,2168,1192,664,62737,235425,217491,235400,33341,150432,47644,235362,236631,238082,235432,236572,235854,54934,235362,12990,1];

async function loadTokenizer(dir: string): Promise<LayaTokenizer | null> {
  const json = await loadLayaTestAsset(`${dir}/tokenizer.json`);
  const config = await loadLayaTestAsset(`${dir}/tokenizer_config.json`);
  if (!json || !config) return null;
  return new LayaTokenizer(JSON.parse(json), JSON.parse(config));
}

describe('LayaSequenceBuilder', () => {
  let en: LayaTokenizer | null = null;
  let ml: LayaTokenizer | null = null;

  beforeAll(async () => {
    en = await loadTokenizer('en');
    ml = await loadTokenizer('multilingual');
  }, 120_000);

  it('reproduces the English A01/department row (window 512, head 192)', () => {
    if (!en) return console.warn('Skipping: English tokenizer assets unavailable');
    const builder = new LayaSequenceBuilder(en, 512, 192);
    const { ids, markers } = builder.build(EN_STATE, DEPARTMENT_QUESTION);
    expect(ids).toEqual(EN_IDS);
    expect(markers).toEqual([12, 22, 32, 39]);
  });

  it('reproduces the multilingual ML_A04/department row (window 256, head 256)', () => {
    if (!ml) return console.warn('Skipping: multilingual tokenizer assets unavailable');
    expect(ml.clsId).toBe(2);
    expect(ml.sepId).toBe(1);
    expect(ml.padId).toBe(0);
    expect(ml.maskId).toBe(4);
    const builder = new LayaSequenceBuilder(ml, 256, 256);
    const { ids, markers } = builder.build(ML_STATE, DEPARTMENT_QUESTION);
    expect(ids).toEqual(ML_IDS);
    expect(markers).toEqual([12, 20, 29, 36]);
  });

  it('right-truncates the state to the room left in the window', () => {
    if (!en) return;
    const builder = new LayaSequenceBuilder(en, 64, 192);
    const longState = 'word '.repeat(200);
    const { ids, markers } = builder.build(longState, DEPARTMENT_QUESTION);
    expect(ids.length).toBe(64);
    expect(ids[ids.length - 1]).toBe(en.sepId);
    expect(markers).toEqual([12, 22, 32, 39]);
  });

  it('renders noul defaults and score levels', () => {
    if (!en) return;
    const builder = new LayaSequenceBuilder(en, 512, 192);
    const noul: LayaQuestion = {
      type: LayaQuestionType.NOUL,
      instructions: 'Is this urgent?',
      options: [
        { label: 'false', description: null },
        { label: 'true', description: null },
      ],
    };
    const head = builder.buildHead(noul);
    expect(head.markers.length).toBe(2);

    const score: LayaQuestion = {
      type: LayaQuestionType.SCORE,
      instructions: 'Rate impact.',
      options: [
        { label: '1', description: 'Minimal' },
        { label: '2', description: 'Low' },
        { label: '3', description: 'High' },
      ],
    };
    expect(builder.buildHead(score).markers.length).toBe(3);
  });
});
