import {TestStatus} from '../../../../enums/test-status.enum';
import {AxonTestResultInterface} from './axon-test-result.interface';
import {AxonTestId} from '../enums/axon-test-id.enum';
import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {AxonSummaryResultsInterface} from './axon-summary-results.interface';

export interface AxonResultInterface {
  startTime?: number;

  endTime?: number;

  status: TestStatus;

  testsResults: AxonTestResultInterface[];

  summary?: {
    [id in BuiltInAiApi]: {
      "cold": AxonSummaryResultsInterface,
      "warm": AxonSummaryResultsInterface,
    }
  }

}
