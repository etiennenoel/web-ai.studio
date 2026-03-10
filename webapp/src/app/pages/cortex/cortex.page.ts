import {Component, OnInit} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  selectedTestIds: Set<string> = new Set<string>();

  apiCollapsedState: { [key: string]: boolean | undefined } = {};
  selectedImageUrl: string | null = null;

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
    [AxonTestId.PromptImageOcrHandwrittenLetter1ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenLetter2ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenLetter3ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenName1ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenName2ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenName3ColdStart]: {},
    [AxonTestId.PromptImageOcrComputerFontColdStart]: {},
    [AxonTestId.PromptImageDescribeColdStart]: {},
    [AxonTestId.PromptImageExplainMemeColdStart]: {},
    [AxonTestId.PromptImageExplainEmotionColdStart]: {},
    [AxonTestId.PromptAudioTranscription119ColdStart]: {},
    [AxonTestId.PromptAudioTranscription4167ColdStart]: {},
    [AxonTestId.PromptAudioTranscription46ColdStart]: {},
    [AxonTestId.PromptAudioTranscription5670ColdStart]: {},
    "pretests": {}
  }

  constructor(
    public readonly axonTestSuiteExecutor: AxonTestSuiteExecutor,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const testsParam = params.get('tests');
      if (testsParam !== null) {
        this.selectedTestIds = new Set(testsParam ? testsParam.split('|') : []);
      } else {
        this.selectedTestIds = new Set(this.axonTestSuiteExecutor.testsSuite);
      }
    });
  }

  toggleTestSelection(testId: string, event?: Event) {
    if (event) event.stopPropagation();
    if (this.selectedTestIds.has(testId)) {
        this.selectedTestIds.delete(testId);
    } else {
        this.selectedTestIds.add(testId);
    }
    this.updateUrl();
  }

  toggleCategorySelection(api: BuiltInAiApi, event?: Event) {
    if (event) event.stopPropagation();
    const tests = this.getTests(api);
    const allSelected = tests.every(t => this.selectedTestIds.has(t.id));
    if (allSelected) {
        tests.forEach(t => this.selectedTestIds.delete(t.id));
    } else {
        tests.forEach(t => this.selectedTestIds.add(t.id));
    }
    this.updateUrl();
  }

  updateUrl() {
    const testsArr = Array.from(this.selectedTestIds);
    this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tests: testsArr.length === this.axonTestSuiteExecutor.testsSuite.length ? null : testsArr.join('|') },
        queryParamsHandling: 'merge'
    });
  }

  isCategorySelected(api: BuiltInAiApi): boolean {
    const tests = this.getTests(api);
    return tests.length > 0 && tests.every(t => this.selectedTestIds.has(t.id));
  }

  isCategoryPartiallySelected(api: BuiltInAiApi): boolean {
    const tests = this.getTests(api);
    if (tests.length === 0) return false;
    const selectedCount = tests.filter(t => this.selectedTestIds.has(t.id)).length;
    return selectedCount > 0 && selectedCount < tests.length;
  }

  isAllSelected(): boolean {
    return this.selectedTestIds.size === this.axonTestSuiteExecutor.testsSuite.length;
  }

  isPartiallySelected(): boolean {
    return this.selectedTestIds.size > 0 && this.selectedTestIds.size < this.axonTestSuiteExecutor.testsSuite.length;
  }

  toggleAllSelection(event?: Event) {
    if (event) event.stopPropagation();
    if (this.isAllSelected()) {
      this.selectedTestIds.clear();
    } else {
      this.selectedTestIds = new Set(this.axonTestSuiteExecutor.testsSuite);
    }
    this.updateUrl();
  }

  async start() {
    // Clear explicit collapse overrides so dynamic opening works based on execution status
    this.apiCollapsedState = {};
    
    // Explicitly open the setup details pane so users can watch the status
    this.viewData.pretests.iterationsCollapsed = false;

    await this.axonTestSuiteExecutor.setup(this.selectedTestIds);

    this.viewData.pretests.iterationsCollapsed = true;

    // Once everything passes, we can start the tests.
    await this.axonTestSuiteExecutor.start(this.selectedTestIds);
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

  get isTestingRunning(): boolean {
    return this.axonTestSuiteExecutor.results.status === TestStatus.Executing || 
           this.axonTestSuiteExecutor.preTestsStatus === TestStatus.Executing;
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
    const allTests = this.getTests(api);
    const tests = allTests.filter(t => this.selectedTestIds.has(t.id));
    if (tests.length === 0) return { total: allTests.length, selected: 0, completed: 0, percentage: 0, passed: 0, failed: 0, executing: 0, idle: 0 };
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
      total: allTests.length,
      selected: tests.length,
      completed,
      passed,
      failed,
      executing,
      idle,
      percentage: Math.round((completed / tests.length) * 100)
    };
  }

  getOverallProgress() {
    const tests = this.axonTestSuiteExecutor.testsSuite.filter(id => this.selectedTestIds.has(id));
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
    
    // If any test in this API is explicitly expanded by user or has expanded outputs, keep the API expanded
    const tests = this.getTests(api);
    const hasExpandedTest = tests.some(test => {
      if (this.viewData[test.id].iterationsCollapsed === false) return true;
      if (this.viewData[test.id].expandedOutputs && Object.values(this.viewData[test.id].expandedOutputs!).some(v => v)) return true;
      return false;
    });

    if (hasExpandedTest) {
      return false;
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
      case BuiltInAiApi.PromptWithImage: return 'bi-image';
      case BuiltInAiApi.Prompt:
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
    
    // If any output is expanded, keep it expanded
    if (this.viewData[test.id].expandedOutputs && Object.values(this.viewData[test.id].expandedOutputs!).some(v => v)) {
      return false;
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

  openImage(url: string, event: Event) {
    event.stopPropagation();
    this.selectedImageUrl = url;
  }

  closeImage() {
    this.selectedImageUrl = null;
  }
}
