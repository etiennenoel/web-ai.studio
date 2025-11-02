import {Component, NgZone} from '@angular/core';
import {AxonTestSuiteExecutor} from './axon-test-suite.executor';
import {TestStatus} from '../../../enums/test-status.enum';
import {BuiltInAiApi} from '../../../enums/built-in-ai-api.enum';
import {EnumUtils, ItemInterface} from '@magieno/common';
import {AxonTestId} from './enums/axon-test-id.enum';
import {AxonTestInterface} from './interfaces/axon-test.interface';
import {AxonSummaryResultsInterface} from './interfaces/axon-summary-results.interface';

@Component({
  selector: 'page-axon',
  standalone: false,
  templateUrl: './axon.page.html',
  styleUrl: './axon.page.scss'
})
export class AxonPage {

  builtInAiApis: ItemInterface[] = EnumUtils.getItems(BuiltInAiApi);

  viewData: { [id in AxonTestId]: {iterationsCollapsed?:boolean} } = {
    [AxonTestId.LanguageDetectorShortStringColdStart]: {
    }
  }

  constructor(
    protected readonly axonTestSuiteExecutor: AxonTestSuiteExecutor,
    ) {
  }

  async start() {
    await this.axonTestSuiteExecutor.start();
  }

  getSummaryResults(builtInAIApi: string | number, startType: "cold" | "warm"): AxonSummaryResultsInterface | undefined {
    return this.axonTestSuiteExecutor.results.summary?.[builtInAIApi as BuiltInAiApi]?.[startType];
  }

  getTests(api: BuiltInAiApi) {
    return this.axonTestSuiteExecutor.testsSuite.filter(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId].results.api === api;
    }).map(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId];
    });
  }


  getBuiltInAiAPIFromItemInterface(item: ItemInterface): BuiltInAiApi {
    return item.id as BuiltInAiApi;
  }

  protected readonly TestStatus = TestStatus;
}

