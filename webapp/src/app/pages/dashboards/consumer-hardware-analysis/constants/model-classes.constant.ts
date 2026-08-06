import {ModelClassEnum} from '../enums/model-class.enum';
import {SourceColumnEnum} from '../enums/source-column.enum';
import {ModelClassInterface} from '../interfaces/model-class.interface';

/**
 * The model sizes, smallest first.
 *
 * The source measures 1–4B as one bucket. Fitting that column gives 4.17 GB moved per
 * token at R² 1.00 — i.e. it behaves like a ~4B model at Q4 — so the bucket *is* the 4B
 * case. 1B and 2B are then the same law with a quarter and half the weights: fewer bytes
 * per token, proportionally more tokens per second. They are marked derived everywhere
 * they appear, and never counted as measured.
 *
 * `quantisedWeightsGb` is the Q4 weight footprint, used to work out how much of the
 * memory bus a decode step converts into tokens; `memoryNeededGb` adds room for a
 * working context and decides whether a size fits on a machine at all.
 */
export const MODEL_CLASSES: ModelClassInterface[] = [
  {
    key: ModelClassEnum.Tiny, name: 'Tiny', sizeLabel: '200–600M',
    sourceColumn: SourceColumnEnum.Tiny, multiplier: 1,
    quantisedWeightsGb: 0.35, memoryNeededGb: 0.6, followsBandwidthLaw: false,
    kvCacheKbPerToken: 16,
  },
  {
    key: ModelClassEnum.Nano1B, name: 'Nano 1B', sizeLabel: '~1B',
    sourceColumn: SourceColumnEnum.Nano, multiplier: 4,
    quantisedWeightsGb: 0.625, memoryNeededGb: 1.2, followsBandwidthLaw: true,
    kvCacheKbPerToken: 32,
  },
  {
    key: ModelClassEnum.Nano2B, name: 'Nano 2B', sizeLabel: '~2B',
    sourceColumn: SourceColumnEnum.Nano, multiplier: 2,
    quantisedWeightsGb: 1.25, memoryNeededGb: 2, followsBandwidthLaw: true,
    kvCacheKbPerToken: 48,
  },
  {
    key: ModelClassEnum.Nano4B, name: 'Nano 4B', sizeLabel: '3–4B',
    sourceColumn: SourceColumnEnum.Nano, multiplier: 1,
    quantisedWeightsGb: 2.5, memoryNeededGb: 3.5, followsBandwidthLaw: true,
    kvCacheKbPerToken: 96,
  },
  {
    key: ModelClassEnum.Light, name: 'Light', sizeLabel: '7–9B',
    sourceColumn: SourceColumnEnum.Light, multiplier: 1,
    quantisedWeightsGb: 4.7, memoryNeededGb: 6, followsBandwidthLaw: true,
    kvCacheKbPerToken: 128,
  },
  {
    key: ModelClassEnum.Mid, name: 'Mid', sizeLabel: '12–14B',
    sourceColumn: SourceColumnEnum.Mid, multiplier: 1,
    quantisedWeightsGb: 8.5, memoryNeededGb: 10, followsBandwidthLaw: true,
    kvCacheKbPerToken: 192,
  },
  {
    key: ModelClassEnum.Large, name: 'Large', sizeLabel: '27–34B',
    sourceColumn: SourceColumnEnum.Large, multiplier: 1,
    quantisedWeightsGb: 18, memoryNeededGb: 20, followsBandwidthLaw: true,
    kvCacheKbPerToken: 256,
  },
  {
    key: ModelClassEnum.Xl, name: 'XL', sizeLabel: '70B+',
    sourceColumn: SourceColumnEnum.Xl, multiplier: 1,
    quantisedWeightsGb: 40, memoryNeededGb: 42, followsBandwidthLaw: true,
    kvCacheKbPerToken: 320,
  },
];

/** The sizes a forecast can speak about: the ones the bandwidth law describes. */
export const PROJECTED_MODEL_CLASSES: ModelClassInterface[] =
  MODEL_CLASSES.filter(modelClass => modelClass.followsBandwidthLaw);

/** Model sizes indexed by key, for the many lookups the views do. */
export const MODEL_CLASS_BY_KEY: Record<ModelClassEnum, ModelClassInterface> = MODEL_CLASSES
  .reduce((map, modelClass) => {
    map[modelClass.key] = modelClass;
    return map;
  }, {} as Record<ModelClassEnum, ModelClassInterface>);

/** True when the size is read off another size's column rather than its own figure. */
export const isDerivedModelClass = (modelClass: ModelClassInterface) => modelClass.multiplier !== 1;
