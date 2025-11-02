import {AxonTestResultInterface} from './axon-test-result.interface';
import {AxonTestId} from '../enums/axon-test-id.enum';

export interface AxonTestInterface {
  id: AxonTestId;

  results: AxonTestResultInterface;

  setup(): Promise<void>;

  run(): Promise<AxonTestResultInterface>;

  postRun(): Promise<void>;
}
