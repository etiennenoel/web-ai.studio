import {AxonTestId} from './enums/axon-test-id.enum';
import {Injectable} from '@angular/core';
import {AxonTestSuiteResults} from './axon-test-suite-results.model';
import {TestStatus} from '../../../enums/test-status.enum';
import {AxonTestInterface} from './interfaces/axon-test.interface';
import {
  LanguageDetectorShortStringColdStartAxonTest
} from './tests/language-detector-short-string-cold-start.axon-test';

@Injectable()
export class AxonTestSuiteExecutor {

  testIdMap: { [id in AxonTestId]: AxonTestInterface };

  testsSuite: AxonTestId[] = [
    AxonTestId.LanguageDetectorShortStringColdStart,
  ];

  results = new AxonTestSuiteResults();

  constructor(
    private readonly languageDetectorShortStringColdStartAxonTest: LanguageDetectorShortStringColdStartAxonTest,
  ) {

    this.testIdMap = {
      [AxonTestId.LanguageDetectorShortStringColdStart]: this.languageDetectorShortStringColdStartAxonTest,
    }
  }

  async start(): Promise<void> {
    this.results.status = TestStatus.Executing

    for (const testSuite of this.testsSuite) {
      const test = this.testIdMap[testSuite];

      await test.setup();
      await test.run();
      await test.postRun();
    }

    // Loop over the testSuite in order and start executing the tests.
  }
}
