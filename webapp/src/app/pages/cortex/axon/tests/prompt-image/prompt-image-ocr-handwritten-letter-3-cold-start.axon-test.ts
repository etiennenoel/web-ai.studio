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
export class PromptImageOcrHandwrittenLetter3ColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptImageOcrHandwrittenLetter3ColdStart;
  
  systemInput = "You are a highly accurate OCR system. Return only the exact text present in the image.";

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.PromptWithImage,
    startType: "cold",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Extract the handwritten text from the provided image.",
    apiAvailability: "unknown",
    inputImageDataUrl: "images/cortex/handwritten_letters/a01-128.png"
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

    const expectedText = `When Mr. Brown sat down Labour MPs cheered for a full minute - and even his bitterest opponents on defence joined in. Mr. Powell devoted half his speech to giving details of plans for improving the hospital service, on which indeed the Government is making progress. His basic defence of the Health Service cuts was that even after the proposed changes the net cost of the service to the Exchequer will have increased over three years by 20 per cent.`;
    const image = await ImageTestUtils.fetchImage(this.results.inputImageDataUrl!);

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now();
      const session = await LanguageModel.create(this.creationOptions);
      iterationResult.creationTime = performance.now() - start;

      const promptInput = [{
        role: "user",
        content: [
          { type: "text", value: "Transcribe the text in this image perfectly." },
          { type: "image", value: image.bitmap }
        ]
      }];

      try {
        const response = session.promptStreaming(promptInput);

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

        const normalizedOutput = output.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedExpected = expectedText.toLowerCase().replace(/[^a-z0-9]/g, '');

        function levenshteinDistance(s: string, t: string) {
            if (!s.length) return t.length;
            if (!t.length) return s.length;
            const arr: number[][] = [];
            for (let i = 0; i <= t.length; i++) {
                arr[i] = [i];
                for (let j = 1; j <= s.length; j++) {
                    arr[i][j] =
                        i === 0 ? j
                        : Math.min(
                            arr[i - 1][j] + 1,
                            arr[i][j - 1] + 1,
                            arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
                        );
                }
            }
            return arr[t.length][s.length];
        }
        
        const dist = levenshteinDistance(normalizedOutput, normalizedExpected);
        const maxLen = Math.max(normalizedOutput.length, normalizedExpected.length);
        const accuracy = maxLen === 0 ? 1 : (maxLen - dist) / maxLen;

        if (accuracy > 0.97) {
           iterationResult.status = TestStatus.Success;
        } else {
           iterationResult.status = TestStatus.Error;
           iterationResult.output = `Validation Failed. Accuracy: ${Math.round(accuracy*100)}%. Expected: '${expectedText}'. Got: ${output}`;
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
