import {
  ClassifierOptionProbability,
  ClassifierSchema,
} from '../../core/services/classifier.service';

export interface DecisionBenchmarkGoldEntry {
  label: string;
  type?: 'boolean' | 'choice' | 'score';
  softProbabilities?: Record<string, number>;
  referenceProbabilities?: Record<string, number>;
  goldScore?: number;
}

export interface DecisionBenchmarkCase {
  id: string;
  workflow?: string;
  referenceModel?: string;
  input: string;
  displayText: string;
  schema?: ClassifierSchema;
  orderStabilityGroup?: string[];
  gold: Record<string, DecisionBenchmarkGoldEntry>;
}

export interface DecisionBenchmarkBaseline {
  id: string;
  name: string;
  provider: string;
  accuracy: number;
  macroF1?: number;
  brierScore?: number;
  nll?: number;
  ece?: number;
  meanConfidence?: number;
  coverageAt5PctRisk?: number;
  scoreMae?: number;
  flipRate?: number;
  latencyP50Ms?: number;
  source: string;
  isLocalRun?: boolean;
  timestamp?: string;
  sampleSize?: number;
}

export interface DecisionBenchmarkPack {
  id: string;
  name: string;
  shortName: string;
  category: 'jev-bench' | 'typed-decisions' | 'dmb' | 'applications' | 'multilingual' | 'parity';
  badge: string;
  icon: string;
  description: string;
  sourceUrl: string;
  datasetUrl: string;
  evaluationMode: 'standard' | 'multi-question' | 'robustness' | 'parity';
  sharedSchema?: ClassifierSchema;
  baselines: DecisionBenchmarkBaseline[];
  cases: DecisionBenchmarkCase[];
}

export interface ReliabilityBin {
  binIndex: number;
  lower: number;
  upper: number;
  count: number;
  meanConfidence: number;
  empiricalAccuracy: number;
  calibrationGap: number;
}

export interface RiskCoveragePoint {
  threshold: number;
  coverage: number;
  accuracy: number;
  risk: number;
}

export interface DecisionQuestionEvalRecord {
  caseId: string;
  questionId: string;
  workflow: string;
  type: 'boolean' | 'choice' | 'score';
  prompt: string;
  displayText: string;
  goldLabel: string;
  predictedLabel: string;
  correct: boolean;
  confidence: number;
  topProbability: number;
  goldProbability: number;
  brierContribution: number;
  nllContribution: number;
  expectedScore?: number | null;
  goldScore?: number | null;
  scoreAbsError?: number | null;
  maxAbsProbDiff?: number | null;
  probabilities: ClassifierOptionProbability[];
  referenceProbabilities?: Record<string, number>;
  latencyMs: number;
}

export interface DecisionCaseEvalRecord {
  caseId: string;
  workflow: string;
  displayText: string;
  latencyMs: number;
  stateTokens: number;
  headTokens: number;
  allCorrect: boolean;
  orderFlipped?: boolean;
  questions: DecisionQuestionEvalRecord[];
}

export interface DecisionSliceMetrics {
  n: number;
  accuracy: number;
  macroF1: number;
  brierScore: number;
  nll: number;
  ece: number;
  meanConfidence: number;
}

export interface DecisionBenchmarkSuiteRunResult {
  runId: string;
  suiteId: string;
  suiteName: string;
  modelId: string;
  modelName: string;
  runtimeLabel: string;
  accelerator: string;
  sampleSize: number;
  totalCases: number;
  totalDecisions: number;
  // Discrimination & Quality
  accuracy: number;
  macroF1: number;
  softAccuracy: number | null;
  scoreMae: number | null;
  within1ScoreLevel: number | null;
  // Calibration & Selective Automation
  brierScore: number;
  nll: number;
  ece: number;
  meanConfidence: number;
  coverageAt5PctRisk: number;
  thresholdAt5PctRisk: number;
  accAt50PctCoverage: number;
  zeroProbFailureRate: number;
  // Robustness & Parity
  flipRate: number | null;
  maxAbsProbDiff: number | null;
  meanAbsProbDiff: number | null;
  argmaxParityRate: number | null;
  // Breakdowns
  byQuestionType: Record<string, DecisionSliceMetrics>;
  byWorkflow: Record<string, DecisionSliceMetrics>;
  reliabilityBins: ReliabilityBin[];
  riskCoverageCurve: RiskCoveragePoint[];
  // Performance & Hardware Telemetry
  coldCreateMs: number | null;
  warmCreateMs: number | null;
  totalElapsedMs: number;
  latencyP50Ms: number;
  latencyP90Ms: number;
  latencyP95Ms: number;
  latencyMeanMs: number;
  msPerDecision: number;
  decisionsPerSec: number;
  casesPerSec: number;
  headTokens: number;
  avgStateTokens: number;
  // Detailed records for row inspector
  caseRecords: DecisionCaseEvalRecord[];
  questionRecords: DecisionQuestionEvalRecord[];
  timestamp: string;
}

export interface DecisionModelCatalogItem {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  window: number;
  headMaxLen: number;
  hidden: number;
  languages: string[];
  totalMB: number;
  description: string;
}

export const DECISION_MODEL_CATALOG: DecisionModelCatalogItem[] = [
  {
    id: 'laya-td-s256-embeds-wfp16',
    name: 'Laya Typed-Decisions (256 tok · fp16)',
    shortName: 'Laya-TD s256 (fp16)',
    badge: 'Recommended · Typed-Decisions Fine-Tune',
    window: 256,
    headMaxLen: 256,
    hidden: 1024,
    languages: ['en'],
    totalMB: 847,
    description: 'ModernBERT-large fine-tuned specifically on typed decisions (choice, boolean, score). Highest accuracy on multi-question workflows.',
  },
  {
    id: 'laya-ml-s256-embeds-wfp16',
    name: 'Laya Multilingual (256 tok · fp16)',
    shortName: 'Laya-ML s256 (fp16)',
    badge: 'Fastest · 51 Languages',
    window: 256,
    headMaxLen: 256,
    hidden: 768,
    languages: ['multilingual'],
    totalMB: 648,
    description: 'mmBERT-base 322M decision encoder supporting 51+ languages. Default extension model with ~18ms WebGPU latency.',
  },
  {
    id: 'laya-en-s256-embeds-wfp16',
    name: 'Laya English Base (256 tok · fp16)',
    shortName: 'Laya-EN s256 (fp16)',
    badge: 'English Base',
    window: 256,
    headMaxLen: 192,
    hidden: 1024,
    languages: ['en'],
    totalMB: 847,
    description: 'ModernBERT-large 421M English decision encoder before typed-decisions fine-tuning.',
  },
  {
    id: 'laya-td-s512-embeds-wfp16',
    name: 'Laya Typed-Decisions (512 tok · fp16)',
    shortName: 'Laya-TD s512 (fp16)',
    badge: 'Long Context · Typed-Decisions',
    window: 512,
    headMaxLen: 256,
    hidden: 1024,
    languages: ['en'],
    totalMB: 848,
    description: 'Typed-decisions fine-tune with a 512-token context window for longer documents.',
  },
  {
    id: 'laya-ml-s512-embeds-wfp16',
    name: 'Laya Multilingual (512 tok · fp16)',
    shortName: 'Laya-ML s512 (fp16)',
    badge: 'Long Context · Multilingual',
    window: 512,
    headMaxLen: 256,
    hidden: 768,
    languages: ['multilingual'],
    totalMB: 649,
    description: 'Multilingual checkpoint with a 512-token context window.',
  },
  {
    id: 'laya-en-s512-embeds-wfp16',
    name: 'Laya English Base (512 tok · fp16)',
    shortName: 'Laya-EN s512 (fp16)',
    badge: 'Long Context · English',
    window: 512,
    headMaxLen: 192,
    hidden: 1024,
    languages: ['en'],
    totalMB: 848,
    description: 'ModernBERT-large English checkpoint with a 512-token context window.',
  },
];
