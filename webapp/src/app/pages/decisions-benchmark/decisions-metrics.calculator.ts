import {
  ClassifierOptionProbability,
  NormalizedDecision,
} from '../../core/services/classifier.service';
import {
  DecisionBenchmarkGoldEntry,
  DecisionBenchmarkSuiteRunResult,
  DecisionCaseEvalRecord,
  DecisionQuestionEvalRecord,
  DecisionSliceMetrics,
  ReliabilityBin,
  RiskCoveragePoint,
} from './decisions-benchmark.models';

const EPS = 1e-12;

export class DecisionsMetricsCalculator {
  static evaluateQuestion(
    caseId: string,
    workflow: string,
    displayText: string,
    decision: NormalizedDecision,
    gold: DecisionBenchmarkGoldEntry,
    latencyMs: number
  ): DecisionQuestionEvalRecord {
    const goldLabel = String(gold.label).trim();
    const predictedLabel = String(decision.label ?? '').trim();
    const correct = predictedLabel.toLowerCase() === goldLabel.toLowerCase();

    const probs: ClassifierOptionProbability[] = decision.probabilities?.length
      ? decision.probabilities
      : [
          { label: predictedLabel, probability: decision.confidence ?? 1 },
        ];

    const topProbability = probs.reduce((m, p) => Math.max(m, p.probability), 0);
    const confidence =
      decision.type === 'boolean'
        ? Math.max(topProbability, 1 - topProbability)
        : topProbability > 0
          ? topProbability
          : decision.confidence ?? 0;

    // Locate gold label probability
    const goldEntry = probs.find(
      (p) => p.label.toLowerCase().trim() === goldLabel.toLowerCase()
    );
    const goldProbability = goldEntry ? Math.max(0, Math.min(1, goldEntry.probability)) : 0;

    // Multiclass Brier contribution: sum_c (p_c - y_c)^2
    let brierContribution = 0;
    let matchedGoldInOptions = false;
    for (const p of probs) {
      const isGold = p.label.toLowerCase().trim() === goldLabel.toLowerCase();
      if (isGold) matchedGoldInOptions = true;
      const target = isGold ? 1.0 : 0.0;
      const diff = p.probability - target;
      brierContribution += diff * diff;
    }
    if (!matchedGoldInOptions) {
      brierContribution += 1.0;
    }

    const nllContribution = -Math.log(Math.max(goldProbability, EPS));

    // Score MAE if ordinal score question
    let scoreAbsError: number | null = null;
    const expectedScore = decision.expectedScore ?? null;
    const goldScore =
      gold.goldScore !== undefined && gold.goldScore !== null
        ? Number(gold.goldScore)
        : decision.type === 'score' && Number.isFinite(Number(goldLabel))
          ? Number(goldLabel)
          : null;

    if (expectedScore !== null && goldScore !== null && Number.isFinite(expectedScore) && Number.isFinite(goldScore)) {
      scoreAbsError = Math.abs(expectedScore - goldScore);
    }

    // Reference probability diff for Parity Gate
    let maxAbsProbDiff: number | null = null;
    if (gold.referenceProbabilities) {
      let maxDiff = 0;
      for (const [refLabel, refProb] of Object.entries(gold.referenceProbabilities)) {
        const match = probs.find((p) => p.label.toLowerCase() === refLabel.toLowerCase());
        const predP = match ? match.probability : 0;
        maxDiff = Math.max(maxDiff, Math.abs(predP - Number(refProb)));
      }
      maxAbsProbDiff = maxDiff;
    }

    return {
      caseId,
      questionId: decision.id,
      workflow,
      type: decision.type,
      prompt: decision.prompt,
      displayText,
      goldLabel,
      predictedLabel,
      correct,
      confidence,
      topProbability,
      goldProbability,
      brierContribution,
      nllContribution,
      expectedScore,
      goldScore,
      scoreAbsError,
      maxAbsProbDiff,
      probabilities: probs,
      referenceProbabilities: gold.referenceProbabilities ?? gold.softProbabilities,
      latencyMs,
    };
  }

  static computeMacroF1(records: DecisionQuestionEvalRecord[]): number {
    if (records.length === 0) return 0;
    const labels = new Set<string>();
    for (const r of records) {
      labels.add(r.goldLabel.toLowerCase());
      labels.add(r.predictedLabel.toLowerCase());
    }
    let f1Sum = 0;
    let count = 0;
    for (const c of labels) {
      let tp = 0;
      let fp = 0;
      let fn = 0;
      for (const r of records) {
        const g = r.goldLabel.toLowerCase() === c;
        const p = r.predictedLabel.toLowerCase() === c;
        if (p && g) tp++;
        else if (p && !g) fp++;
        else if (!p && g) fn++;
      }
      const denom = 2 * tp + fp + fn;
      f1Sum += denom > 0 ? (2 * tp) / denom : 0;
      count++;
    }
    return count > 0 ? f1Sum / count : 0;
  }

  static computeReliabilityBins(
    records: DecisionQuestionEvalRecord[],
    numBins = 10
  ): { ece: number; bins: ReliabilityBin[] } {
    const bins: ReliabilityBin[] = [];
    const n = records.length;
    if (n === 0) {
      for (let i = 0; i < numBins; i++) {
        bins.push({
          binIndex: i,
          lower: i / numBins,
          upper: (i + 1) / numBins,
          count: 0,
          meanConfidence: (i + 0.5) / numBins,
          empiricalAccuracy: 0,
          calibrationGap: 0,
        });
      }
      return { ece: 0, bins };
    }

    let ece = 0;
    for (let i = 0; i < numBins; i++) {
      const lower = i / numBins;
      const upper = (i + 1) / numBins;
      const inBin = records.filter((r) => {
        const c = Math.max(0, Math.min(1, r.topProbability));
        return i === 0 ? c >= lower && c <= upper : c > lower && c <= upper;
      });
      if (inBin.length === 0) {
        bins.push({
          binIndex: i,
          lower,
          upper,
          count: 0,
          meanConfidence: (lower + upper) / 2,
          empiricalAccuracy: 0,
          calibrationGap: 0,
        });
      } else {
        const meanConf = inBin.reduce((s, r) => s + r.topProbability, 0) / inBin.length;
        const empAcc = inBin.reduce((s, r) => s + (r.correct ? 1 : 0), 0) / inBin.length;
        const gap = Math.abs(empAcc - meanConf);
        ece += (inBin.length / n) * gap;
        bins.push({
          binIndex: i,
          lower,
          upper,
          count: inBin.length,
          meanConfidence: meanConf,
          empiricalAccuracy: empAcc,
          calibrationGap: gap,
        });
      }
    }
    return { ece, bins };
  }

  static computeSelectiveAutomation(
    records: DecisionQuestionEvalRecord[],
    errorBudget = 0.05
  ): {
    coverageAtBudget: number;
    thresholdAtBudget: number;
    accAt50PctCoverage: number;
    curve: RiskCoveragePoint[];
  } {
    const n = records.length;
    if (n === 0) {
      return {
        coverageAtBudget: 0,
        thresholdAtBudget: 1,
        accAt50PctCoverage: 0,
        curve: [],
      };
    }

    const sortedDesc = [...records].sort((a, b) => b.topProbability - a.topProbability);
    const halfN = Math.max(1, Math.floor(n / 2));
    const accAt50PctCoverage =
      sortedDesc.slice(0, halfN).reduce((s, r) => s + (r.correct ? 1 : 0), 0) / halfN;

    const uniqueThresholds = Array.from(
      new Set(records.map((r) => Number(r.topProbability.toFixed(4))))
    ).sort((a, b) => a - b);

    let bestCoverage = 0;
    let bestThreshold = 1.0;

    for (const tau of uniqueThresholds) {
      const selected = records.filter((r) => r.topProbability >= tau);
      if (selected.length === 0) continue;
      const errors = selected.reduce((s, r) => s + (r.correct ? 0 : 1), 0);
      const risk = errors / selected.length;
      if (risk <= errorBudget) {
        bestCoverage = selected.length / n;
        bestThreshold = tau;
        break; // Lowest threshold tau gives highest coverage
      }
    }

    const curve: RiskCoveragePoint[] = [];
    for (let step = 0; step <= 20; step++) {
      const tau = step * 0.05;
      const selected = records.filter((r) => r.topProbability >= tau);
      if (selected.length === 0) {
        curve.push({ threshold: tau, coverage: 0, accuracy: 1, risk: 0 });
      } else {
        const acc = selected.reduce((s, r) => s + (r.correct ? 1 : 0), 0) / selected.length;
        curve.push({
          threshold: Number(tau.toFixed(2)),
          coverage: Number((selected.length / n).toFixed(4)),
          accuracy: Number(acc.toFixed(4)),
          risk: Number((1 - acc).toFixed(4)),
        });
      }
    }

    return {
      coverageAtBudget: bestCoverage,
      thresholdAtBudget: bestThreshold,
      accAt50PctCoverage,
      curve,
    };
  }

  static computeSliceMetrics(records: DecisionQuestionEvalRecord[]): DecisionSliceMetrics {
    const n = records.length;
    if (n === 0) {
      return {
        n: 0,
        accuracy: 0,
        macroF1: 0,
        brierScore: 0,
        nll: 0,
        ece: 0,
        meanConfidence: 0,
      };
    }
    const accuracy = records.reduce((s, r) => s + (r.correct ? 1 : 0), 0) / n;
    const macroF1 = DecisionsMetricsCalculator.computeMacroF1(records);
    const brierScore = records.reduce((s, r) => s + r.brierContribution, 0) / n;
    const nll = records.reduce((s, r) => s + r.nllContribution, 0) / n;
    const meanConfidence = records.reduce((s, r) => s + r.topProbability, 0) / n;
    const { ece } = DecisionsMetricsCalculator.computeReliabilityBins(records, 10);
    return {
      n,
      accuracy,
      macroF1,
      brierScore,
      nll,
      ece,
      meanConfidence,
    };
  }

  static percentile(sortedAsc: number[], p: number): number {
    if (sortedAsc.length === 0) return 0;
    const idx = Math.min(
      sortedAsc.length - 1,
      Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1)
    );
    return sortedAsc[idx];
  }

  static summarizeSuiteRun(params: {
    suiteId: string;
    suiteName: string;
    modelId: string;
    modelName: string;
    runtimeLabel: string;
    accelerator: string;
    sampleSize: number;
    coldCreateMs: number | null;
    warmCreateMs: number | null;
    totalElapsedMs: number;
    caseRecords: DecisionCaseEvalRecord[];
  }): DecisionBenchmarkSuiteRunResult {
    const { caseRecords } = params;
    const questionRecords = caseRecords.flatMap((c) => c.questions);
    const totalCases = caseRecords.length;
    const totalDecisions = questionRecords.length;

    const baseSlice = DecisionsMetricsCalculator.computeSliceMetrics(questionRecords);
    const { ece, bins } = DecisionsMetricsCalculator.computeReliabilityBins(questionRecords, 10);
    const selective = DecisionsMetricsCalculator.computeSelectiveAutomation(questionRecords, 0.05);

    // Soft accuracy (dot product against teacher soft distribution when present)
    const softScores: number[] = [];
    for (const q of questionRecords) {
      if (q.referenceProbabilities) {
        let dot = 0;
        for (const p of q.probabilities) {
          const refP = q.referenceProbabilities[p.label] ?? 0;
          dot += p.probability * Number(refP);
        }
        if (dot > 0) softScores.push(dot);
      }
    }
    const softAccuracy =
      softScores.length > 0
        ? softScores.reduce((a, b) => a + b, 0) / softScores.length
        : null;

    // Score MAE and within-1-level
    const scoreRecords = questionRecords.filter(
      (q) => q.scoreAbsError !== null && q.scoreAbsError !== undefined
    );
    const scoreMae =
      scoreRecords.length > 0
        ? scoreRecords.reduce((s, q) => s + (q.scoreAbsError ?? 0), 0) / scoreRecords.length
        : null;
    const within1ScoreLevel =
      scoreRecords.length > 0
        ? scoreRecords.reduce((s, q) => s + ((q.scoreAbsError ?? 0) <= 1.0 ? 1 : 0), 0) /
          scoreRecords.length
        : null;

    // Option-Order Flip Rate
    const orderCases = caseRecords.filter((c) => c.orderFlipped !== undefined);
    const flipRate =
      orderCases.length > 0
        ? orderCases.reduce((s, c) => s + (c.orderFlipped ? 1 : 0), 0) / orderCases.length
        : null;

    // Parity Gate metrics
    const parityRecords = questionRecords.filter(
      (q) => q.maxAbsProbDiff !== null && q.maxAbsProbDiff !== undefined
    );
    const maxAbsProbDiff =
      parityRecords.length > 0
        ? parityRecords.reduce((m, q) => Math.max(m, q.maxAbsProbDiff ?? 0), 0)
        : null;
    const meanAbsProbDiff =
      parityRecords.length > 0
        ? parityRecords.reduce((s, q) => s + (q.maxAbsProbDiff ?? 0), 0) / parityRecords.length
        : null;
    const argmaxParityRate =
      parityRecords.length > 0
        ? parityRecords.reduce((s, q) => s + (q.correct ? 1 : 0), 0) / parityRecords.length
        : null;

    const zeroProbFailures = questionRecords.filter((q) => q.goldProbability <= 1e-6).length;
    const zeroProbFailureRate = totalDecisions > 0 ? zeroProbFailures / totalDecisions : 0;

    // Breakdowns by question type & workflow
    const byQuestionType: Record<string, DecisionSliceMetrics> = {};
    for (const qt of ['choice', 'boolean', 'score'] as const) {
      const sub = questionRecords.filter((q) => q.type === qt);
      if (sub.length > 0) {
        byQuestionType[qt] = DecisionsMetricsCalculator.computeSliceMetrics(sub);
      }
    }

    const byWorkflow: Record<string, DecisionSliceMetrics> = {};
    const workflows = Array.from(new Set(questionRecords.map((q) => q.workflow).filter(Boolean)));
    for (const wf of workflows) {
      const sub = questionRecords.filter((q) => q.workflow === wf);
      if (sub.length > 0) {
        byWorkflow[wf] = DecisionsMetricsCalculator.computeSliceMetrics(sub);
      }
    }

    // Latencies
    const caseLatencies = caseRecords.map((c) => c.latencyMs).sort((a, b) => a - b);
    const latencyMeanMs =
      caseLatencies.length > 0
        ? caseLatencies.reduce((a, b) => a + b, 0) / caseLatencies.length
        : 0;
    const latencyP50Ms = DecisionsMetricsCalculator.percentile(caseLatencies, 50);
    const latencyP90Ms = DecisionsMetricsCalculator.percentile(caseLatencies, 90);
    const latencyP95Ms = DecisionsMetricsCalculator.percentile(caseLatencies, 95);

    const totalInferenceMs = Math.max(1, caseLatencies.reduce((a, b) => a + b, 0));
    const msPerDecision = totalDecisions > 0 ? totalInferenceMs / totalDecisions : 0;
    const decisionsPerSec = totalDecisions > 0 ? (totalDecisions / totalInferenceMs) * 1000 : 0;
    const casesPerSec = totalCases > 0 ? (totalCases / totalInferenceMs) * 1000 : 0;

    const headTokens =
      caseRecords.length > 0
        ? Math.round(
            caseRecords.reduce((s, c) => s + (c.headTokens || 0), 0) / caseRecords.length
          )
        : 0;
    const avgStateTokens =
      caseRecords.length > 0
        ? Math.round(
            caseRecords.reduce((s, c) => s + (c.stateTokens || 0), 0) / caseRecords.length
          )
        : 0;

    return {
      runId: crypto.randomUUID(),
      suiteId: params.suiteId,
      suiteName: params.suiteName,
      modelId: params.modelId,
      modelName: params.modelName,
      runtimeLabel: params.runtimeLabel,
      accelerator: params.accelerator,
      sampleSize: params.sampleSize,
      totalCases,
      totalDecisions,
      accuracy: baseSlice.accuracy,
      macroF1: baseSlice.macroF1,
      softAccuracy,
      scoreMae,
      within1ScoreLevel,
      brierScore: baseSlice.brierScore,
      nll: baseSlice.nll,
      ece,
      meanConfidence: baseSlice.meanConfidence,
      coverageAt5PctRisk: selective.coverageAtBudget,
      thresholdAt5PctRisk: selective.thresholdAtBudget,
      accAt50PctCoverage: selective.accAt50PctCoverage,
      zeroProbFailureRate,
      flipRate,
      maxAbsProbDiff,
      meanAbsProbDiff,
      argmaxParityRate,
      byQuestionType,
      byWorkflow,
      reliabilityBins: bins,
      riskCoverageCurve: selective.curve,
      coldCreateMs: params.coldCreateMs,
      warmCreateMs: params.warmCreateMs,
      totalElapsedMs: params.totalElapsedMs,
      latencyP50Ms,
      latencyP90Ms,
      latencyP95Ms,
      latencyMeanMs,
      msPerDecision,
      decisionsPerSec,
      casesPerSec,
      headTokens,
      avgStateTokens,
      caseRecords,
      questionRecords,
      timestamp: new Date().toISOString(),
    };
  }
}
