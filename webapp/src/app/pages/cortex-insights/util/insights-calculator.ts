import { MathematicalCalculations } from '../../cortex/axon/util/mathematical-calculations';

export interface IterationData {
  status: string;
  tokensPerSecond?: number;
  inputTokensPerSecond?: number;
  charactersPerSecond?: number;
  timeToFirstToken?: number;
  totalResponseTime?: number;
  totalNumberOfInputTokens?: number;
  totalNumberOfOutputTokens?: number;
}

export interface TestMetrics {
  api: string;
  startType?: string;
  ttft: number;
  speed: number;
  inputSpeed: number;
  charSpeed: number;
  total: number;
  avgInputTokens?: number;
  avgOutputTokens?: number;
}

export interface AggregatedMetrics {
  speed: number;
  inputSpeed: number;
  charSpeed: number;
  ttft: number;
  total: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

export interface FleetMetrics {
  avgSpeed: number;
  avgInputSpeed: number;
  avgCharSpeed: number;
  avgTtft: number;
}

/**
 * Handles all metric calculations for Cortex Insights.
 *
 * Key rules:
 * - Values of -1 mean "not applicable" (e.g. non-streaming APIs have tokensPerSecond = -1).
 *   They are always excluded from averages.
 * - Values of 0 mean "no data". They are also excluded from speed/throughput averages
 *   because including them would skew results downward.
 * - For timing metrics (ttft, total), 0 is a valid value and is included.
 */
export class InsightsCalculator {

  /**
   * Computes per-API test metrics from raw iteration data.
   * Groups iterations by API + startType and calculates averages for each group.
   */
  static computeTestMetrics(testsResults: { api: string; startType?: string; testIterationResults: IterationData[] }[]): TestMetrics[] {
    const groups = new Map<string, { api: string; startType?: string; iterations: IterationData[] }>();

    for (const testResult of testsResults) {
      const api = testResult.api;
      const startType = testResult.startType;
      const key = startType ? `${api}::${startType}` : api;
      if (!groups.has(key)) groups.set(key, { api, startType, iterations: [] });
      const iterations = (testResult.testIterationResults || []).filter(i => i.status === 'Success');
      groups.get(key)!.iterations.push(...iterations);
    }

    const results: TestMetrics[] = [];

    groups.forEach(({ api, startType, iterations }) => {
      if (iterations.length === 0) return;

      const tokensPerSecs = InsightsCalculator.extractPositiveValues(iterations, 'tokensPerSecond');
      const inputTokensPerSecs = InsightsCalculator.extractPositiveValues(iterations, 'inputTokensPerSecond');
      const charsPerSecs = InsightsCalculator.extractPositiveValues(iterations, 'charactersPerSecond');
      const inputTokenCounts = InsightsCalculator.extractPositiveValues(iterations, 'totalNumberOfInputTokens');
      const outputTokenCounts = InsightsCalculator.extractPositiveValues(iterations, 'totalNumberOfOutputTokens');

      results.push({
        api,
        startType,
        ttft: MathematicalCalculations.calculateAverage(
          iterations.map(i => i.timeToFirstToken ?? 0)
        ),
        speed: tokensPerSecs.length > 0 ? MathematicalCalculations.calculateAverage(tokensPerSecs) : 0,
        inputSpeed: inputTokensPerSecs.length > 0 ? MathematicalCalculations.calculateAverage(inputTokensPerSecs) : 0,
        charSpeed: charsPerSecs.length > 0 ? MathematicalCalculations.calculateAverage(charsPerSecs) : 0,
        total: MathematicalCalculations.calculateAverage(
          iterations.map(i => i.totalResponseTime ?? 0)
        ),
        avgInputTokens: inputTokenCounts.length > 0 ? MathematicalCalculations.calculateAverage(inputTokenCounts) : undefined,
        avgOutputTokens: outputTokenCounts.length > 0 ? MathematicalCalculations.calculateAverage(outputTokenCounts) : undefined,
      });
    });

    return results;
  }

  /**
   * Aggregates per-API test metrics into a single set of metrics for a baseline entry.
   * Only includes positive values in speed/throughput averages.
   */
  static aggregateTestMetrics(tests: TestMetrics[]): AggregatedMetrics {
    const speedVals = tests.map(t => t.speed).filter(v => v > 0);
    const inputSpeedVals = tests.map(t => t.inputSpeed).filter(v => v > 0);
    const charSpeedVals = tests.map(t => t.charSpeed).filter(v => v > 0);
    const ttftVals = tests.map(t => t.ttft);
    const totalVals = tests.map(t => t.total);
    const inputTokenVals = tests.map(t => t.avgInputTokens).filter((v): v is number => v !== undefined && v > 0);
    const outputTokenVals = tests.map(t => t.avgOutputTokens).filter((v): v is number => v !== undefined && v > 0);

    return {
      speed: speedVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(speedVals)) : 0,
      inputSpeed: inputSpeedVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(inputSpeedVals)) : 0,
      charSpeed: charSpeedVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(charSpeedVals)) : 0,
      ttft: Math.round(MathematicalCalculations.calculateAverage(ttftVals)),
      total: Math.round(MathematicalCalculations.calculateAverage(totalVals)),
      avgInputTokens: inputTokenVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(inputTokenVals)) : 0,
      avgOutputTokens: outputTokenVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(outputTokenVals)) : 0,
    };
  }

  /**
   * Computes fleet-wide averages from leaderboard entries.
   * Only includes positive values in speed/throughput averages.
   */
  static computeFleetMetrics(entries: AggregatedMetrics[]): FleetMetrics {
    const speedVals = entries.map(e => e.speed).filter(v => v > 0);
    const inputSpeedVals = entries.map(e => e.inputSpeed).filter(v => v > 0);
    const charSpeedVals = entries.map(e => e.charSpeed).filter(v => v > 0);
    const ttftVals = entries.map(e => e.ttft);

    return {
      avgSpeed: speedVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(speedVals)) : 0,
      avgInputSpeed: inputSpeedVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(inputSpeedVals)) : 0,
      avgCharSpeed: charSpeedVals.length > 0 ? Math.round(MathematicalCalculations.calculateAverage(charSpeedVals)) : 0,
      avgTtft: Math.round(MathematicalCalculations.calculateAverage(ttftVals)),
    };
  }

  /**
   * Extracts values > 0 from iterations for a given numeric field.
   * Filters out -1 (not applicable) and 0 (no data).
   */
  private static extractPositiveValues(iterations: IterationData[], field: keyof IterationData): number[] {
    return iterations
      .map(i => (i[field] as number) ?? 0)
      .filter(v => v > 0);
  }
}
