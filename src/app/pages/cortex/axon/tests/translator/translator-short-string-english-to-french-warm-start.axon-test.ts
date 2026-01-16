import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';

@Injectable()
export class TranslatorShortStringEnglishToFrenchWarmStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.TranslatorShortStringEnglishToFrenchWarmStart;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Translator,
    startType: "warm",
    numberOfIterations: 100,
    testIterationResults: [],
    input: "In which language is this sentence? I believe it is in french.",
    apiAvailability: "unknown",
  };

  creationOptions = {
    sourceLanguage: "en",
    targetLanguage: "fr"
  };

  async apiStatus(): Promise<Availability | "unknown"> {
    return Translator.availability(this.creationOptions);
  }

  async setup(): Promise<void> {
    try {
      this.results.apiAvailability = await this.apiStatus();

      const ld = await Translator.create(this.creationOptions)
    } catch (e) {
      this.results.status = TestStatus.Error;
    }
  }

  async preRun(): Promise<void> {
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

    let start = performance.now()
    const translator = await Translator.create(this.creationOptions)
    const creationTime = performance.now() - start;

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;
      start = performance.now()
      iterationResult.creationTime = creationTime;

      const response = await translator.translate(this.results.input);

      iterationResult.output = JSON.stringify(response);
      iterationResult.totalResponseTime = performance.now() - start;
      iterationResult.timeToFirstToken = iterationResult.totalResponseTime;
      iterationResult.totalNumberOfInputTokens = this.results.input.length;
      iterationResult.totalNumberOfOutputTokens = iterationResult.output.length;
      iterationResult.tokensPerSecond = iterationResult.totalNumberOfOutputTokens / (iterationResult.totalResponseTime / 1000)

      // Validate the output of the test here before setting the result.
      iterationResult.status = TestStatus.Success;
    }

    AxonTestResultCalculator.calculate(this.results);

    return this.results;
  }

  async postRun(): Promise<void> {
    this.results.status = TestStatus.Success
  }
}
