import {Component, OnInit} from '@angular/core';
import {AxonTestSuiteExecutor} from './axon/axon-test-suite.executor';
import {TestStatus} from '../../enums/test-status.enum';
import {BuiltInAiApi} from '../../enums/built-in-ai-api.enum';
import {AxonTestId} from './axon/enums/axon-test-id.enum';
import {AxonTestInterface} from './axon/interfaces/axon-test.interface';
import {AxonSummaryResultsInterface} from './axon/interfaces/axon-summary-results.interface';
import {MathematicalCalculations} from './axon/util/mathematical-calculations';
import {EnumUtils} from '../../core/utils/enum.utils';
import {ItemInterface} from '../../core/interfaces/item.interface';

@Component({
  selector: 'page-cortex',
  standalone: false,
  templateUrl: './cortex.page.html',
  styleUrl: './cortex.page.scss'
})
export class CortexPage implements OnInit {

  builtInAiApis: ItemInterface[] = EnumUtils.getItems(BuiltInAiApi);

  apiCollapsedState: { [key: string]: boolean | undefined } = {};

  viewData: { [id in (AxonTestId | "pretests")]: {iterationsCollapsed?:boolean, expandedOutputs?: {[key: number]: boolean}} } = {
    [AxonTestId.LanguageDetectorShortStringColdStart]: {},
    [AxonTestId.LanguageDetectorShortStringWarmStart]: {},
    [AxonTestId.TranslatorShortStringEnglishToFrenchColdStart]: {},
    [AxonTestId.TranslatorShortStringEnglishToFrenchWarmStart]: {},
    [AxonTestId.SummarizerLongNewsArticleColdStart]: {},
    [AxonTestId.SummarizerLongNewsArticleWarmStart]: {},
    [AxonTestId.PromptTextFactAnalysisColdStart]: {},
    [AxonTestId.PromptTextEthicalAndCreativeColdStart]: {},
    [AxonTestId.PromptTextTechnicalChallengeColdStart]: {},
    "pretests": {}
  }

  constructor(
    public readonly axonTestSuiteExecutor: AxonTestSuiteExecutor
    ) {
  }

  ngOnInit() {
  }

  async start() {
    // Clear explicit collapse overrides so dynamic opening works based on execution status
    this.apiCollapsedState = {};
    
    // Explicitly open the setup details pane so users can watch the status
    this.viewData.pretests.iterationsCollapsed = false;

    await this.axonTestSuiteExecutor.setup();

    this.viewData.pretests.iterationsCollapsed = true;

    // Once everything passes, we can start the tests.
    await this.axonTestSuiteExecutor.start();
  }

  forceSetup(testId: AxonTestId): Promise<void> {
    return this.axonTestSuiteExecutor.forceSetup(testId);
  }

  getSummaryResults(builtInAIApi: string | number, startType: "cold" | "warm"): AxonSummaryResultsInterface | undefined {
    const items = this.axonTestSuiteExecutor.results.testsResults.filter(value => {
      return value.api === builtInAIApi && value.startType === startType;
    }).map(item => item.testIterationResults).flat(1).filter(item => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    return {
        averageTokenPerSecond: MathematicalCalculations.calculateAverage(items.map(item => item.tokensPerSecond ?? 0)),
        averageTimeToFirstToken: MathematicalCalculations.calculateAverage(items.map(item => item.timeToFirstToken ?? 0)),
        averageTotalResponseTime: MathematicalCalculations.calculateAverage(items.map(item => item.totalResponseTime ?? 0)),
        medianTimeToFirstToken: MathematicalCalculations.calculateMedian(items.map(item => item.timeToFirstToken ?? 0)),
        medianTotalResponseTime: MathematicalCalculations.calculateMedian(items.map(item => item.totalResponseTime ?? 0)),
        medianTokenPerSecond: MathematicalCalculations.calculateMedian(items.map(item => item.tokensPerSecond ?? 0))
    };
  }

  getTests(api: BuiltInAiApi) {
    return this.axonTestSuiteExecutor.testsSuite.filter(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId].results.api === api;
    }).sort((a, b) => {
      return a.localeCompare(b, "en");
    }).map(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId];
    });
  }

  getBuiltInAiAPIFromItemInterface(item: ItemInterface): BuiltInAiApi {
    return item.id as BuiltInAiApi;
  }

  get currentExecutingTest(): AxonTestInterface | null {
    if (this.axonTestSuiteExecutor.results.status !== TestStatus.Executing) return null;
    
    for (const testId of this.axonTestSuiteExecutor.testsSuite) {
      const test = this.axonTestSuiteExecutor.testIdMap[testId];
      if (test.results.status === TestStatus.Executing) {
        return test;
      }
    }
    return null;
  }

  getApiProgress(api: BuiltInAiApi) {
    const tests = this.getTests(api);
    if (tests.length === 0) return { total: 0, completed: 0, percentage: 0, passed: 0, failed: 0, executing: 0, idle: 0 };
    let completed = 0;
    let passed = 0;
    let failed = 0;
    let executing = 0;
    let idle = 0;
    for (const test of tests) {
      if (test.results.status === TestStatus.Success) {
        completed++;
        passed++;
      } else if (test.results.status === TestStatus.Error) {
        completed++;
        failed++;
      } else if (test.results.status === TestStatus.Executing) {
        executing++;
      } else if (test.results.status === TestStatus.Idle) {
        idle++;
      }
    }
    return {
      total: tests.length,
      completed,
      passed,
      failed,
      executing,
      idle,
      percentage: Math.round((completed / tests.length) * 100)
    };
  }

  getOverallProgress() {
    const tests = this.axonTestSuiteExecutor.testsSuite;
    if (tests.length === 0) return { total: 0, completed: 0, percentage: 0 };
    let completed = 0;
    for (const testId of tests) {
      const test = this.axonTestSuiteExecutor.testIdMap[testId];
      if (test.results.status === TestStatus.Success || test.results.status === TestStatus.Error) {
        completed++;
      }
    }
    return {
      total: tests.length,
      completed,
      percentage: Math.round((completed / tests.length) * 100)
    };
  }

  isApiCollapsed(api: BuiltInAiApi, progress: {percentage: number}): boolean {
    if (this.apiCollapsedState[api] !== undefined) {
      return this.apiCollapsedState[api]!;
    }
    
    // Dynamic logic based on execution state
    if (this.axonTestSuiteExecutor.results.status === TestStatus.Executing) {
       // Expand if it's the currently executing API
       if (this.currentExecutingTest?.results?.api === api) {
         return false; // expanded
       }
       // Collapse if it's completed
       if (progress.percentage === 100) {
         return true; // collapsed
       }
       // Collapse if it hasn't started yet
       if (progress.percentage === 0) {
         return true; // collapsed
       }
    }
    
    // Default collapsed
    return true;
  }

  toggleApi(api: BuiltInAiApi, progress: {percentage: number}) {
    this.apiCollapsedState[api] = !this.isApiCollapsed(api, progress);
  }

  toggleOutput(testId: AxonTestId, index: number) {
    if (!this.viewData[testId].expandedOutputs) {
      this.viewData[testId].expandedOutputs = {};
    }
    this.viewData[testId].expandedOutputs![index] = !this.viewData[testId].expandedOutputs![index];
  }

  getIconForApi(api: BuiltInAiApi): string {
    switch (api) {
      case BuiltInAiApi.LanguageDetector: return 'bi-search';
      case BuiltInAiApi.Translator: return 'bi-translate';
      case BuiltInAiApi.Summarizer: return 'bi-card-text';
      case BuiltInAiApi.Prompt:
      case BuiltInAiApi.PromptWithImage:
      case BuiltInAiApi.PromptWithAudio:
        return 'bi-chat-text';
      case BuiltInAiApi.Proofreader: return 'bi-spellcheck';
      case BuiltInAiApi.Rewriter: return 'bi-pencil-square';
      case BuiltInAiApi.Writer: return 'bi-pen';
      default: return 'bi-cpu';
    }
  }

  isTestCollapsed(test: AxonTestInterface): boolean {
    if (this.viewData[test.id].iterationsCollapsed !== undefined) {
      return this.viewData[test.id].iterationsCollapsed!;
    }
    return test.results.status !== TestStatus.Executing;
  }

  toggleTest(testId: AxonTestId) {
    const test = this.axonTestSuiteExecutor.testIdMap[testId];
    this.viewData[testId].iterationsCollapsed = !this.isTestCollapsed(test);
  }

  unescapeOutput(output: string): string {
    return output.replace(/\\\\/g, '\\') // 1. Unescape backslashes
      .replace(/\\"/g, '"')   // 2. Unescape double quotes
      .replace(/\\'/g, "'")   // 3. Unescape single quotes
      .replace(/\\n/g, '\n')   // 4. Unescape newlines
      .replace(/\\r/g, '\r')   // 5. Unescape carriage returns
      .replace(/\\t/g, '\t')   // 6. Unescape tabs
      .replace(/\\b/g, '\b')   // 7. Unescape backspaces
      .replace(/\\f/g, '\f');  // 8. Unescape form feeds;
  }

  protected readonly TestStatus = TestStatus;
}
