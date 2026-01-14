import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {TestStatus} from '../../../../enums/test-status.enum';
import {AxonTestIterationResultInterface} from './axon-test-iteration-result.interface';

export interface AxonTestResultInterface {
  id: string;

  api: BuiltInAiApi;

  status: TestStatus;

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
