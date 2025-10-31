import {AxonTestInterface} from '../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../enums/axon-test-id.enum';
import {TestStatus} from '../../../../enums/test-status.enum';

@Injectable()
export class LanguageDetectorShortStringColdStartAxonTest implements AxonTestInterface {
  api: BuiltInAiApi = BuiltInAiApi.LanguageDetector;
  id: string = AxonTestId.LanguageDetectorShortStringColdStart;
  startType: "cold" | "warm" = "cold";

  postRun(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async run(): Promise<AxonTestResultInterface> {
    const results: AxonTestResultInterface = {
      api: this.api,
      startType: this.startType,
      id: this.id,
      status: TestStatus.Executing,
    };

    return results;
  }
  
  setup(): Promise<void> {
    return Promise.resolve(undefined);
  }

}
