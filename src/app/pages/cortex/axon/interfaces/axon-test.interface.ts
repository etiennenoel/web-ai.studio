import {AxonTestResultInterface} from './axon-test-result.interface';
import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';

export interface AxonTestInterface {
  id: string;

  api: BuiltInAiApi;

  startType: "cold" | "warm";

  setup(): Promise<void>;

  run(): Promise<AxonTestResultInterface>;

  postRun(): Promise<void>;
}
