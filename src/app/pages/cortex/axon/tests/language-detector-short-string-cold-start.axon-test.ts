import {AxonTestInterface} from '../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../enums/axon-test-id.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

@Injectable()
export class LanguageDetectorShortStringColdStartAxonTest implements AxonTestInterface {
  id: string = AxonTestId.LanguageDetectorShortStringColdStart;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.LanguageDetector,
    startType: "cold",
    numberOfIterations: 10,
    testIterationResults: [],
  };

  constructor(
  ) {
  }

  async setup(): Promise<void> {
    this.results.status = TestStatus.Executing;
    this.results.testIterationResults = [];
  }

  async run(): Promise<AxonTestResultInterface> {
    // Create all the iterations first.
    for(let i = 0; i < this.results.numberOfIterations; i++) {
      this.results.testIterationResults.push({
        status: TestStatus.Idle,
      });
    }

    for(let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      // const ld = await LanguageDetector.create({})
      //
      // await ld.detect("Hello World");

     await new Promise(resolve => setTimeout(resolve, 2000));

      // Validate the output of the test here before setting the result.
      iterationResult.status = TestStatus.Success;
    }

    return this.results;
  }

  async postRun(): Promise<void> {
    this.results.status = TestStatus.Success
  }
}
