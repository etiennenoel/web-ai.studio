import { AxonTestResultInterface } from '../interfaces/axon-test-result.interface';
import { MathematicalCalculations } from './mathematical-calculations';

export class AxonTestResultCalculator {
  static calculate(results: AxonTestResultInterface): void {
    const totalResponseTimes = results.testIterationResults.map(r => r.totalResponseTime ?? 0);
    // Ignore -1 for non-streaming token calculations
    const tokensPerSeconds = results.testIterationResults.map(r => r.tokensPerSecond ?? 0).filter(v => v !== -1);
    const charsPerSeconds = results.testIterationResults.map(r => r.charactersPerSecond ?? 0);
    const timeToFirstTokens = results.testIterationResults.map(r => r.timeToFirstToken ?? 0);
    const inputTokens = results.testIterationResults.map(r => r.totalNumberOfInputTokens ?? 0);

    results.averageTotalResponseTime = MathematicalCalculations.calculateAverage(totalResponseTimes);
    if (tokensPerSeconds.length > 0) {
        results.averageTokensPerSecond = MathematicalCalculations.calculateAverage(tokensPerSeconds);
        results.medianTokensPerSecond = MathematicalCalculations.calculateMedian(tokensPerSeconds);
    }
    results.averageCharactersPerSecond = MathematicalCalculations.calculateAverage(charsPerSeconds);
    results.averageTimeToFirstToken = MathematicalCalculations.calculateAverage(timeToFirstTokens);
    if (inputTokens.length > 0) {
        results.averageInputTokens = MathematicalCalculations.calculateAverage(inputTokens);
        results.medianInputTokens = MathematicalCalculations.calculateMedian(inputTokens);
    }

    results.medianTotalResponseTime = MathematicalCalculations.calculateMedian(totalResponseTimes);
    results.medianCharactersPerSecond = MathematicalCalculations.calculateMedian(charsPerSeconds);
    results.medianTimeToFirstToken = MathematicalCalculations.calculateMedian(timeToFirstTokens);
  }
}
