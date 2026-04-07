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

  inputImageDataUrl?: string;

  inputAudioUrl?: string;
  inputAudioDuration?: number;

  numberOfIterations: number;

  averageTimeToFirstToken?: number;

  averageInputTokens?: number;

  averageTotalResponseTime?: number;

  averageTokensPerSecond?: number;

  averageCharactersPerSecond?: number;

  medianTimeToFirstToken?: number;

  medianInputTokens?: number;

  medianTotalResponseTime?: number;

  medianTokensPerSecond?: number;

  medianCharactersPerSecond?: number;

  inputContextSize?: number;

  startType: "cold" | "warm";

  testIterationResults: AxonTestIterationResultInterface[];
}
