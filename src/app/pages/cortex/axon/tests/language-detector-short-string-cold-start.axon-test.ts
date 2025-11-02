import {AxonTestInterface} from '../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../enums/axon-test-id.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

@Injectable()
export class LanguageDetectorShortStringColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.LanguageDetectorShortStringColdStart;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.LanguageDetector,
    startType: "cold",
    numberOfIterations: 100,
    testIterationResults: [],
    input: "In which language is this sentence? I believe it is in french.",
  };

  async setup(): Promise<void> {
    this.results.status = TestStatus.Executing;
    this.results.testIterationResults = [];
  }

  async run(): Promise<AxonTestResultInterface> {
    // Create all the iterations first.
    for (let i = 0; i < this.results.numberOfIterations; i++) {
      this.results.testIterationResults.push({
        status: TestStatus.Idle,
      });
    }

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now()

      const ld = await LanguageDetector.create({})

      iterationResult.creationTime = performance.now() - start;

      const response = await ld.detect(this.results.input);

      iterationResult.output = JSON.stringify(response);
      iterationResult.totalResponseTime = performance.now() - start;
      iterationResult.timeToFirstToken = iterationResult.totalResponseTime;
      iterationResult.totalNumberOfInputTokens = this.results.input.length;
      iterationResult.totalNumberOfOutputTokens = iterationResult.output.length;
      iterationResult.tokensPerSecond = iterationResult.totalNumberOfOutputTokens / (iterationResult.totalResponseTime / 1000)

      // Validate the output of the test here before setting the result.
      iterationResult.status = TestStatus.Success;
    }

    // Calculate the average
    this.results.averageTotalResponseTime = this.results.testIterationResults.reduce((a, b) => { return a + (b.totalResponseTime ?? 0)} , 0) / this.results.numberOfIterations;
    this.results.averageTokensPerSecond = this.results.testIterationResults.reduce((a, b) => { return a + (b.tokensPerSecond ?? 0)} , 0) / this.results.numberOfIterations;
    this.results.averageTimeToFirstToken = this.results.testIterationResults.reduce((a, b) => { return a + (b.timeToFirstToken ?? 0)} , 0) / this.results.numberOfIterations;

    // Calculate the median
    const totalResponseTimes = this.results.testIterationResults.map(r => r.totalResponseTime ?? 0).sort((a, b) => a - b);
    const tokensPerSeconds = this.results.testIterationResults.map(r => r.tokensPerSecond ?? 0).sort((a, b) => a - b);
    const timeToFirstTokens = this.results.testIterationResults.map(r => r.timeToFirstToken ?? 0).sort((a, b) => a - b);

    const mid = Math.floor(this.results.numberOfIterations / 2);

    this.results.medianTotalResponseTime = this.results.numberOfIterations % 2 === 0
      ? (totalResponseTimes[mid - 1] + totalResponseTimes[mid]) / 2
      : totalResponseTimes[mid];

    this.results.medianTokensPerSecond = this.results.numberOfIterations % 2 === 0
        ? (tokensPerSeconds[mid - 1] + tokensPerSeconds[mid]) / 2
        : tokensPerSeconds[mid];

    this.results.medianTimeToFirstToken = this.results.numberOfIterations % 2 === 0
        ? (timeToFirstTokens[mid - 1] + timeToFirstTokens[mid]) / 2
        : timeToFirstTokens[mid];


    return this.results;
  }

  async postRun(): Promise<void> {
    this.results.status = TestStatus.Success
  }
}
