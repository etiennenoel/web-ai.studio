import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

export interface AxonTestResultInterface {
  id: string;

  api: BuiltInAiApi;

  output: string;

  status: TestStatus;

  timeToFirstToken?: number;

  totalResponseTime?: number;

  tokensPerSecond?: number;

  totalNumberOfInputTokens?: number;

  totalNumberOfOutputTokens?: number;

  startType: "cold" | "warm";
}
