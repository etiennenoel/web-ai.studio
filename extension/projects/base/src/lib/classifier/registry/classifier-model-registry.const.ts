import { ClassifierModelVariant } from '../interfaces/classifier-model-variant.interface';
import { ClassifierModelInputMode } from '../enums/classifier-model-input-mode.enum';
import { ClassifierModelFileRole } from '../enums/classifier-model-file-role.enum';

const LAYA_LITERT = 'litert-community/laya-LiteRT';
const LAYA_ML_LITERT = 'litert-community/Laya-Multilingual-LiteRT';

const ML_TOKENIZER_FILES = [
  { role: ClassifierModelFileRole.TOKENIZER, path: 'multilingual/tokenizer.json', bytes: 34363188 },
  { role: ClassifierModelFileRole.TOKENIZER_CONFIG, path: 'multilingual/tokenizer_config.json', bytes: 524 },
  { role: ClassifierModelFileRole.CALIBRATION, path: 'multilingual/calibration.json', bytes: 9156 },
];

const EN_TOKENIZER_FILES = [
  { role: ClassifierModelFileRole.TOKENIZER, path: 'en/tokenizer.json', bytes: 3583228 },
  { role: ClassifierModelFileRole.TOKENIZER_CONFIG, path: 'en/tokenizer_config.json', bytes: 308 },
  { role: ClassifierModelFileRole.CALIBRATION, path: 'en/rl_agent_config.json', bytes: 745 },
];

const ML_EMBEDS_HOST_FILES = [
  { role: ClassifierModelFileRole.ACT_HEAD, path: 'laya_ml_act_head_fp32.tflite', bytes: 795816 },
  { role: ClassifierModelFileRole.EMBEDDING_TABLE, path: 'token_embeddings_fp16.bin', bytes: 393216000 },
  { role: ClassifierModelFileRole.TOKENIZER, path: 'tokenizer.json', bytes: 34363188 },
  { role: ClassifierModelFileRole.TOKENIZER_CONFIG, path: 'tokenizer_config.json', bytes: 524 },
  { role: ClassifierModelFileRole.CALIBRATION, path: 'laya_ml_calibration.json', bytes: 9156 },
];

/**
 * Model variants the Classifier polyfill can download from Hugging Face.
 * Byte counts come from the repositories' `hfmodels.json` / README tables.
 */
export const CLASSIFIER_MODEL_REGISTRY: ClassifierModelVariant[] = [
  {
    id: 'laya-ml-s256-embeds-wfp16',
    family: 'Laya',
    name: 'Laya multilingual, 256 tokens, fp16 weights (host embeddings)',
    description: 'mmBERT-base decision encoder. 251 MB graph plus a 393 MB embedding table. Compiles on GPU.',
    repository: LAYA_ML_LITERT,
    window: 256,
    headMaxLen: 256,
    hidden: 768,
    inputMode: ClassifierModelInputMode.INPUTS_EMBEDS,
    languages: ['multilingual'],
    gpuCompiles: true,
    files: [
      { role: ClassifierModelFileRole.MAIN_GRAPH, path: 'laya_ml_s256_embeds_wfp16.tflite', bytes: 250889408 },
      ...ML_EMBEDS_HOST_FILES,
    ],
  },
  {
    id: 'laya-ml-s512-embeds-wfp16',
    family: 'Laya',
    name: 'Laya multilingual, 512 tokens, fp16 weights (host embeddings)',
    description: 'Same checkpoint with a 512-token window for longer inputs.',
    repository: LAYA_ML_LITERT,
    window: 512,
    headMaxLen: 256,
    hidden: 768,
    inputMode: ClassifierModelInputMode.INPUTS_EMBEDS,
    languages: ['multilingual'],
    gpuCompiles: true,
    files: [
      { role: ClassifierModelFileRole.MAIN_GRAPH, path: 'laya_ml_s512_embeds_wfp16.tflite', bytes: 251806912 },
      ...ML_EMBEDS_HOST_FILES,
    ],
  },
  {
    id: 'laya-ml-s256-wfp16',
    family: 'Laya',
    name: 'Laya multilingual, 256 tokens, fp16 weights',
    description: 'Single 644 MB graph with the embedding table inside. Publisher reports CPU-only compilation.',
    repository: LAYA_LITERT,
    window: 256,
    headMaxLen: 256,
    hidden: 768,
    inputMode: ClassifierModelInputMode.TOKEN_IDS,
    languages: ['multilingual'],
    gpuCompiles: false,
    files: [
      { role: ClassifierModelFileRole.MAIN_GRAPH, path: 'laya_ml_s256_wfp16.tflite', bytes: 644077088 },
      { role: ClassifierModelFileRole.ACT_HEAD, path: 'laya_ml_act_head_fp32.tflite', bytes: 795816 },
      ...ML_TOKENIZER_FILES,
    ],
  },
  {
    id: 'laya-ml-s256-fp32',
    family: 'Laya',
    name: 'Laya multilingual, 256 tokens, fp32',
    description: 'Full-precision 1.29 GB graph. Compiles on GPU.',
    repository: LAYA_LITERT,
    window: 256,
    headMaxLen: 256,
    hidden: 768,
    inputMode: ClassifierModelInputMode.TOKEN_IDS,
    languages: ['multilingual'],
    gpuCompiles: true,
    files: [
      { role: ClassifierModelFileRole.MAIN_GRAPH, path: 'laya_ml_s256_fp32.tflite', bytes: 1287375376 },
      { role: ClassifierModelFileRole.ACT_HEAD, path: 'laya_ml_act_head_fp32.tflite', bytes: 795816 },
      ...ML_TOKENIZER_FILES,
    ],
  },
  {
    id: 'laya-en-s256-fp32',
    family: 'Laya',
    name: 'Laya English, 256 tokens, fp32',
    description: 'ModernBERT-large decision encoder, English only. 1.68 GB graph. Compiles on GPU.',
    repository: LAYA_LITERT,
    window: 256,
    headMaxLen: 192,
    hidden: 1024,
    inputMode: ClassifierModelInputMode.TOKEN_IDS,
    languages: ['en'],
    gpuCompiles: true,
    files: [
      { role: ClassifierModelFileRole.MAIN_GRAPH, path: 'laya_en_s256_fp32.tflite', bytes: 1684754688 },
      { role: ClassifierModelFileRole.ACT_HEAD, path: 'laya_act_head_fp32.tflite', bytes: 1057960 },
      ...EN_TOKENIZER_FILES,
    ],
  },
  {
    id: 'laya-en-s512-wfp16',
    family: 'Laya',
    name: 'Laya English, 512 tokens, fp16 weights',
    description: 'English only, 844 MB graph. Publisher reports CPU-only compilation.',
    repository: LAYA_LITERT,
    window: 512,
    headMaxLen: 192,
    hidden: 1024,
    inputMode: ClassifierModelInputMode.TOKEN_IDS,
    languages: ['en'],
    gpuCompiles: false,
    files: [
      { role: ClassifierModelFileRole.MAIN_GRAPH, path: 'laya_en_s512_wfp16.tflite', bytes: 843929120 },
      { role: ClassifierModelFileRole.ACT_HEAD, path: 'laya_act_head_fp32.tflite', bytes: 1057960 },
      ...EN_TOKENIZER_FILES,
    ],
  },
];

export const DEFAULT_CLASSIFIER_MODEL_VARIANT_ID = CLASSIFIER_MODEL_REGISTRY[0].id;
