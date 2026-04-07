import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

export interface AxonTestIterationResultInterface {
  output?: string;

  status: TestStatus;

  creationTime?: number;

  timeToFirstToken?: number;

  totalResponseTime?: number;

  tokensPerSecond?: number;

  inputTokensPerSecond?: number;

  totalNumberOfInputTokens?: number;

  totalNumberOfOutputTokens?: number;

  totalNumberOfOutputCharacters?: number;

  charactersPerSecond?: number;

  inputLength?: number;

  inputTokenCount?: number;
}
