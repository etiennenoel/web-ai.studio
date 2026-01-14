import { AxonTestResultInterface } from '../interfaces/axon-test-result.interface';
import { MathematicalCalculations } from './mathematical-calculations';

export class AxonTestResultCalculator {
  static calculate(results: AxonTestResultInterface): void {
    const totalResponseTimes = results.testIterationResults.map(r => r.totalResponseTime ?? 0);
    const tokensPerSeconds = results.testIterationResults.map(r => r.tokensPerSecond ?? 0);
    const timeToFirstTokens = results.testIterationResults.map(r => r.timeToFirstToken ?? 0);

    results.averageTotalResponseTime = MathematicalCalculations.calculateAverage(totalResponseTimes);
    results.averageTokensPerSecond = MathematicalCalculations.calculateAverage(tokensPerSeconds);
    results.averageTimeToFirstToken = MathematicalCalculations.calculateAverage(timeToFirstTokens);

    results.medianTotalResponseTime = MathematicalCalculations.calculateMedian(totalResponseTimes);
    results.medianTokensPerSecond = MathematicalCalculations.calculateMedian(tokensPerSeconds);
    results.medianTimeToFirstToken = MathematicalCalculations.calculateMedian(timeToFirstTokens);
  }
}
