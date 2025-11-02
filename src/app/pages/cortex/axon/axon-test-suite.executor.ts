import {AxonTestId} from './enums/axon-test-id.enum';
import {Injectable} from '@angular/core';
import {TestStatus} from '../../../enums/test-status.enum';
import {AxonTestInterface} from './interfaces/axon-test.interface';
import {
  LanguageDetectorShortStringColdStartAxonTest
} from './tests/language-detector-short-string-cold-start.axon-test';
import {AxonResultInterface} from './interfaces/axon-result.interface';
import {BuiltInAiApi} from '../../../enums/built-in-ai-api.enum';
import {MathematicalCalculations} from './util/mathematical-calculations';
import {AxonTestIterationResultInterface} from './interfaces/axon-test-iteration-result.interface';

@Injectable()
export class AxonTestSuiteExecutor {

  testIdMap: { [id in AxonTestId]: AxonTestInterface };

  testsSuite: AxonTestId[] = [
    AxonTestId.LanguageDetectorShortStringColdStart,
  ];

  results: AxonResultInterface;

  constructor(
    private readonly languageDetectorShortStringColdStartAxonTest: LanguageDetectorShortStringColdStartAxonTest,
  ) {

    this.testIdMap = {
      [AxonTestId.LanguageDetectorShortStringColdStart]: this.languageDetectorShortStringColdStartAxonTest,
    }

    this.results = {
      status: TestStatus.Idle,
      testsResults: [],
    };
  }

  async start(): Promise<void> {
    this.results.status = TestStatus.Executing

    for (const testSuite of this.testsSuite) {
      const test = this.testIdMap[testSuite];

      await test.setup();
      await test.run();
      await test.postRun();

      this.results.testsResults.push(test.results);
    }

    // Compile the data
    // @ts-expect-error
    this.results.summary = {};

    for(const builtInAiAPI of Object.values(BuiltInAiApi)) {
      // @ts-expect-error
      this.results.summary[builtInAiAPI] = {
        "cold": {},
        "warm": {},
      }
      for(const startType of ["warm", "cold"]) {
        const items = this.results.testsResults.filter(value => {
          return value.api === builtInAiAPI && value.startType == startType;
        }).map(item => item.testIterationResults).flat(1)

        const summary = this.results.summary![builtInAiAPI][startType as "cold" | "warm"]!;

        summary.averageTokenPerSecond = MathematicalCalculations.calculateAverage(items.map(item => item.tokensPerSecond ?? 0));
        summary.averageTimeToFirstToken = MathematicalCalculations.calculateAverage(items.map(item => item.timeToFirstToken ?? 0));
        summary.averageTotalResponseTime = MathematicalCalculations.calculateAverage(items.map(item => item.totalResponseTime ?? 0));

        summary.medianTimeToFirstToken = MathematicalCalculations.calculateMedian(items.map(item => item.timeToFirstToken ?? 0));
        summary.medianTotalResponseTime = MathematicalCalculations.calculateMedian(items.map(item => item.totalResponseTime ?? 0));
        summary.medianTokenPerSecond = MathematicalCalculations.calculateMedian(items.map(item => item.tokensPerSecond ?? 0));
      }
    }

    this.results.status = TestStatus.Success;
  }
}
