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
export class PromptImageOcrHandwrittenLetter1ColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptImageOcrHandwrittenLetter1ColdStart;
  abortSignal?: AbortSignal;
  
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
    inputImageDataUrl: "images/cortex/handwritten_letters/a01-058.png"
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

    const expectedText = `President Kennedy is ready to get tough over West Germany's cash offer to help America's balance of payments position. He said bluntly in Washington yesterday that the offer - 357 million - was not good enough. And he indicated that his Government would try to get Germany to pay more. He did not mention personal talks with Dr. Adenauer, the West German Chancellor.`;
    const image = await ImageTestUtils.fetchImage(this.results.inputImageDataUrl!);

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now();
      const session = await LanguageModel.create({ ...this.creationOptions, signal: this.abortSignal });
      this.results.inputContextSize = session.inputQuota;
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
        let chunkCount = 0;

        for await (const chunk of response) {

          chunkCount++;
          if(output === "") {
            iterationResult.timeToFirstToken = performance.now() - start;
          }
          output += chunk;
        }

        iterationResult.output = output;
        iterationResult.totalResponseTime = performance.now() - start;
        let inputTokens = JSON.stringify(promptInput).length;
        try {
          if (typeof (session as any).measureInputUsage === 'function') {
            inputTokens = await (session as any).measureInputUsage(promptInput);
          } else if (typeof (session as any).measureContextUsage === 'function') {
            inputTokens = await (session as any).measureContextUsage(promptInput);
          }
        } catch (e) {
          console.warn('Could not measure input usage', e);
        }
        iterationResult.totalNumberOfInputTokens = inputTokens;
        iterationResult.totalNumberOfOutputTokens = chunkCount;
        iterationResult.totalNumberOfOutputCharacters = iterationResult.output.length;
        iterationResult.tokensPerSecond = iterationResult.totalNumberOfOutputTokens / (iterationResult.totalResponseTime / 1000);
        iterationResult.charactersPerSecond = iterationResult.totalNumberOfOutputCharacters / (iterationResult.totalResponseTime / 1000);
        iterationResult.inputLength = this.results.input?.length || 0;

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

        iterationResult.output = `Accuracy: ${Math.round(accuracy*100)}%\n\nExpected:\n${expectedText}\n\nActual:\n${output}`;

        if (accuracy > 0.97) {
           iterationResult.status = TestStatus.Success;
        } else {
           iterationResult.status = TestStatus.Error;
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
