import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {TestStatus} from '../../../../enums/test-status.enum';
import {AxonTestIterationResultInterface} from './axon-test-iteration-result.interface';
import {AxonTestId} from '../enums/axon-test-id.enum';

export interface AxonTestResultInterface {
  id: AxonTestId;

  api: BuiltInAiApi;

  status: TestStatus;

  apiAvailability: Availability | "unknown";

  input: string;

  numberOfIterations: number;

  averageTimeToFirstToken?: number;

  averageTotalResponseTime?: number;

  averageTokensPerSecond?: number;

  medianTimeToFirstToken?: number;

  medianTotalResponseTime?: number;

  medianTokensPerSecond?: number;

  startType: "cold" | "warm";

  testIterationResults: AxonTestIterationResultInterface[];
}
