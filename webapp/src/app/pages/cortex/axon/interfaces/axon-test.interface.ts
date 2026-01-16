import {AxonTestResultInterface} from './axon-test-result.interface';
import {AxonTestId} from '../enums/axon-test-id.enum';

export interface AxonTestInterface {
  id: AxonTestId;

  results: AxonTestResultInterface;

  apiStatus(): Promise<Availability | "unknown">;

  /**
   * This method setups the API to be usable by the tests.
   */
  setup(): Promise<void>

  preRun(): Promise<void>;

  run(): Promise<AxonTestResultInterface>;

  postRun(): Promise<void>;
}
