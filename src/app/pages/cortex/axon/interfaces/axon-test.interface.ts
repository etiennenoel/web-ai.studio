import {AxonTestResultInterface} from './axon-test-result.interface';
import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

export interface AxonTestInterface {
  id: string;

  results: AxonTestResultInterface;

  setup(): Promise<void>;

  run(): Promise<AxonTestResultInterface>;

  postRun(): Promise<void>;
}
