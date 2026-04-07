export interface AxonSummaryResultsInterface {
  averageTokenPerSecond?: number;
  averageInputTokensPerSecond?: number;
  averageCharactersPerSecond?: number;
  averageTimeToFirstToken?: number;
  averageTotalResponseTime?: number;
  medianTokenPerSecond?: number;
  medianInputTokensPerSecond?: number;
  medianCharactersPerSecond?: number;
  medianTimeToFirstToken?: number;
  medianTotalResponseTime?: number;
}
