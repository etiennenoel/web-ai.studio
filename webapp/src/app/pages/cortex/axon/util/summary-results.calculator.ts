import { AxonSummaryResultsInterface } from '../interfaces/axon-summary-results.interface';
import { AxonTestIterationResultInterface } from '../interfaces/axon-test-iteration-result.interface';
import { MathematicalCalculations } from './mathematical-calculations';
import { TestStatus } from '../../../../enums/test-status.enum';

/**
 * Centralizes the aggregation of test iteration results into summary metrics.
 *
 * Why this exists: The same summary calculation logic was duplicated in both
 * cortex.page.ts (for local test results) and comparison-data.service.ts
 * (for baseline data). The cortex.page version additionally computed medians.
 * This class unifies both into a single source of truth so that metric
 * calculations stay consistent across the entire Cortex benchmarking system.
 */
export class SummaryResultsCalculator {

  /**
   * Metric keys on AxonTestIterationResultInterface that map to summary fields.
   * Each entry defines the iteration field name and the corresponding average
   * and (optional) median field names on AxonSummaryResultsInterface.
   */
  private static readonly METRIC_MAPPINGS: {
    iterationKey: keyof AxonTestIterationResultInterface;
    averageKey: keyof AxonSummaryResultsInterface;
    medianKey?: keyof AxonSummaryResultsInterface;
  }[] = [
    { iterationKey: 'tokensPerSecond', averageKey: 'averageTokenPerSecond', medianKey: 'medianTokenPerSecond' },
    { iterationKey: 'inputTokensPerSecond', averageKey: 'averageInputTokensPerSecond', medianKey: 'medianInputTokensPerSecond' },
    { iterationKey: 'charactersPerSecond', averageKey: 'averageCharactersPerSecond', medianKey: 'medianCharactersPerSecond' },
    { iterationKey: 'timeToFirstToken', averageKey: 'averageTimeToFirstToken', medianKey: 'medianTimeToFirstToken' },
    { iterationKey: 'totalResponseTime', averageKey: 'averageTotalResponseTime', medianKey: 'medianTotalResponseTime' },
    { iterationKey: 'totalNumberOfInputTokens', averageKey: 'averageInputTokens' },
  ];

  /**
   * Aggregates successful test iteration results into summary metrics.
   *
   * @param iterations - Raw iteration results (only successful ones are used)
   * @param includeMedians - Whether to compute median values alongside averages.
   *   Medians are useful for the local test runner view where outlier resilience matters,
   *   but unnecessary for baseline comparison where we only show averages.
   * @returns Summary metrics, or undefined if no successful iterations exist
   */
  static calculate(
    iterations: AxonTestIterationResultInterface[],
    includeMedians: boolean = false
  ): AxonSummaryResultsInterface | undefined {
    const successfulItems = iterations.filter(item => item.status === TestStatus.Success);
    if (successfulItems.length === 0) return undefined;

    const result: AxonSummaryResultsInterface = {};

    for (const mapping of this.METRIC_MAPPINGS) {
      result[mapping.averageKey] = this.computeAggregate(successfulItems, mapping.iterationKey, 'average');

      if (includeMedians && mapping.medianKey) {
        result[mapping.medianKey] = this.computeAggregate(successfulItems, mapping.iterationKey, 'median');
      }
    }

    return result;
  }

  /**
   * Filters test results by API and/or startType, then calculates summary metrics.
   *
   * Why this method exists: Both the local test runner and the baseline comparison
   * system need to filter test results by API category before aggregating. This
   * method centralizes that filtering to avoid divergent filter logic.
   *
   * @param testResults - Array of test result objects (each containing testIterationResults)
   * @param filters - Criteria to filter which test results are included
   * @param includeMedians - Whether to compute median values
   * @returns Summary metrics for the filtered results, or undefined if none match
   */
  static fromTestResults(
    testResults: { api?: string; startType?: string; id?: string; testIterationResults?: AxonTestIterationResultInterface[] }[],
    filters: {
      api?: string | number;
      startType?: 'cold' | 'warm';
      selectedTestIds?: Set<string>;
      ignoreSelection?: boolean;
    },
    includeMedians: boolean = false
  ): AxonSummaryResultsInterface | undefined {
    if (!testResults) return undefined;

    const iterations = testResults
      .filter(result => {
        if (filters.api !== undefined && result.api !== filters.api) return false;
        if (filters.startType !== undefined && result.startType !== filters.startType) return false;
        if (!filters.ignoreSelection && filters.selectedTestIds && result.id) {
          if (!filters.selectedTestIds.has(result.id)) return false;
        }
        return true;
      })
      .map(item => item.testIterationResults || [])
      .flat(1);

    return this.calculate(iterations, includeMedians);
  }

  /**
   * Computes a single aggregate value (average or median) for a given metric.
   *
   * Handles the special case where a metric value of -1 indicates "not applicable"
   * (e.g., tokensPerSecond is -1 for APIs that don't report token counts).
   * In that case, -1 is returned so the UI can display "N/A" appropriately.
   */
  private static computeAggregate(
    items: AxonTestIterationResultInterface[],
    key: keyof AxonTestIterationResultInterface,
    mode: 'average' | 'median'
  ): number {
    const validValues = items
      .map(item => item[key] as number)
      .filter(v => v != null && v !== 0 && v !== -1);

    if (validValues.length > 0) {
      return mode === 'average'
        ? MathematicalCalculations.calculateAverage(validValues)
        : MathematicalCalculations.calculateMedian(validValues);
    }

    // If any item explicitly marked the metric as "not applicable" (-1),
    // propagate that signal so the UI shows "N/A" instead of zero.
    if (items.some(item => (item[key] as number) === -1)) return -1;

    return 0;
  }
}
