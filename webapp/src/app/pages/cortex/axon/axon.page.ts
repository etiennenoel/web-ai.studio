import {Component, NgZone} from '@angular/core';
import {AxonTestSuiteExecutor} from './axon-test-suite.executor';
import {TestStatus} from '../../../enums/test-status.enum';
import {BuiltInAiApi} from '../../../enums/built-in-ai-api.enum';
import {EnumUtils, ItemInterface} from '@magieno/common';
import {AxonTestId} from './enums/axon-test-id.enum';
import {AxonTestInterface} from './interfaces/axon-test.interface';
import {AxonSummaryResultsInterface} from './interfaces/axon-summary-results.interface';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {CodeModal} from '../../../modals/code/code.modal';

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
    },
    [AxonTestId.LanguageDetectorShortStringWarmStart]: {
    },
    [AxonTestId.TranslatorShortStringEnglishToFrenchColdStart]: {
    },
    [AxonTestId.TranslatorShortStringEnglishToFrenchWarmStart]: {
    },
    [AxonTestId.SummarizerLongNewsArticleColdStart]: {
    },
    [AxonTestId.SummarizerLongNewsArticleWarmStart]: {
    },
    [AxonTestId.PromptTextFactAnalysisColdStart]: {
    },
    [AxonTestId.PromptTextEthicalAndCreativeColdStart]: {
    },
    [AxonTestId.PromptTextTechnicalChallengeColdStart]: {
    },
  }

  constructor(
    protected readonly axonTestSuiteExecutor: AxonTestSuiteExecutor,
    protected readonly ngbModal: NgbModal
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
    }).sort((a, b) => {
      return a.localeCompare(b, "en");
    }).map(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId];
    });
  }

  getBuiltInAiAPIFromItemInterface(item: ItemInterface): BuiltInAiApi {
    return item.id as BuiltInAiApi;
  }

  openOutputModal(output: string) {
    const modal = this.ngbModal.open(CodeModal, {
      size: "xl"
    });

    (modal.componentInstance as CodeModal).code = output.replace(/\\\\/g, '\\') // 1. Unescape backslashes
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

