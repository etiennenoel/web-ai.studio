import {AxonTestResultInterface} from './interfaces/axon-test-result.interface';
import {TestStatus} from '../../../enums/test-status.enum';

export class AxonTestSuiteResults {
  startTime?: Date;

  endTime?: Date;

  status: TestStatus = TestStatus.Idle;

  averageTimeToFirstToken?: number;

  medianTimeToFirstToken?: number;

  averageResponseTime?: number;

  medianResponseTime?: number;

  averageTokensPerSecond?: number;

  medianTokensPerSecond?: number;

  testResults: AxonTestResultInterface[] = [];
}
