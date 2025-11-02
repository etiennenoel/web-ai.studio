import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

export interface AxonTestIterationResultInterface {
  output?: string;

  status: TestStatus;

  creationTime?: number;

  timeToFirstToken?: number;

  totalResponseTime?: number;

  tokensPerSecond?: number;

  totalNumberOfInputTokens?: number;

  totalNumberOfOutputTokens?: number;
}
