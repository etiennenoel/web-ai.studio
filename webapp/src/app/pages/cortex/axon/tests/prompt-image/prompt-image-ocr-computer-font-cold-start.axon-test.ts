import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';
import {ImageTestUtils} from './util/image-test-utils';

declare const LanguageModel: any;

@Injectable()
export class PromptImageOcrComputerFontColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptImageOcrComputerFontColdStart;
  abortSignal?: AbortSignal;
  
  systemInput = "You are a highly accurate OCR system. Return only the exact text present in the image.";

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.PromptWithImage,
    startType: "cold",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Extract the computer font text from the provided image canvas.",
    apiAvailability: "unknown",
  };

  creationOptions: any = {
    expectedInputs: [{ type: "text" }, { type: "image" }],
    initialPrompts: [{role: "system", content: this.systemInput}]
  };

  async apiStatus(): Promise<any> {
    if (typeof LanguageModel === 'undefined') return "unavailable";
    return LanguageModel.availability(this.creationOptions);
  }

  async setup(): Promise<void> {
    try {
      this.results.apiAvailability = await this.apiStatus();
    } catch (e) {
      this.results.status = TestStatus.Error;
    }
  }

  async preRun(): Promise<void> {
    this.results.status = TestStatus.Executing;
    this.results.testIterationResults = [];
  }

  async run(): Promise<AxonTestResultInterface> {
    for (let i = 0; i < this.results.numberOfIterations; i++) {
      this.results.testIterationResults.push({
        status: TestStatus.Idle,
      });
    }

    const testWord = "Web_AI_Studio_123";
    const image = await ImageTestUtils.createTextImage(testWord, "bold 30px monospace");
    this.results.inputImageDataUrl = image.dataUrl;

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now();
      const session = await LanguageModel.create({ ...this.creationOptions, signal: this.abortSignal });
      iterationResult.creationTime = performance.now() - start;

      const promptInput = [{
        role: "user",
        content: [
          { type: "text", value: "Transcribe the text in this image perfectly." },
          { type: "image", value: image.bitmap }
        ]
      }];

      try {
        const response = session.promptStreaming(promptInput, { signal: this.abortSignal });

        let output = "";
        for await (const chunk of response) {
          if(output === "") {
            iterationResult.timeToFirstToken = performance.now() - start;
          }
          output += chunk;
        }

        iterationResult.output = output;
        iterationResult.totalResponseTime = performance.now() - start;
        iterationResult.totalNumberOfInputTokens = JSON.stringify(promptInput).length;
        iterationResult.totalNumberOfOutputTokens = iterationResult.output.length;
        iterationResult.tokensPerSecond = iterationResult.totalNumberOfOutputTokens / (iterationResult.totalResponseTime / 1000);

        if (output.toLowerCase().includes(testWord.toLowerCase())) {
           iterationResult.status = TestStatus.Success;
        } else {
           iterationResult.status = TestStatus.Error;
           iterationResult.output = `Validation Failed. Expected to find '${testWord}'. Got: ${output}`;
        }
      } catch (e: any) {
        iterationResult.status = TestStatus.Error;
        iterationResult.output = e?.message || "Unknown error";
      } finally {
        if (session && typeof session.destroy === 'function') {
           try { session.destroy(); } catch(e) {}
        }
      }
    }

    AxonTestResultCalculator.calculate(this.results);
    return this.results;
  }

  async postRun(): Promise<void> {
    if (this.results.testIterationResults.every(r => r.status === TestStatus.Success)) {
      this.results.status = TestStatus.Success;
    } else {
      this.results.status = TestStatus.Error;
    }
  }
}
