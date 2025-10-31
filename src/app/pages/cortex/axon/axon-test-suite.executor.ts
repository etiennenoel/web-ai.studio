import {AxonTestId} from './enums/axon-test-id.enum';
import {Injectable} from '@angular/core';
import {AxonTestSuiteResults} from './axon-test-suite-results.model';
import {TestStatus} from '../../../enums/test-status.enum';

@Injectable()
export class AxonTestSuiteExecutor {
  testsSuite: AxonTestId[] = [
    AxonTestId.LanguageDetectorShortStringColdStart,
  ];

  results = new AxonTestSuiteResults();

  async start(): Promise<void> {
    this.results.status = TestStatus.Executing
  }
}
