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
export class PromptImageExplainEmotionColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptImageExplainEmotionColdStart;
  abortSignal?: AbortSignal;
  
  systemInput = "You are a helpful AI assistant that analyzes human emotions in images.";

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.PromptWithImage,
    startType: "cold",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Explain the emotion shown in this image.",
    apiAvailability: "unknown",
    inputImageDataUrl: "images/cortex/Disgusted_Homelander.jpg"
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

    const image = await ImageTestUtils.fetchImage("images/cortex/Disgusted_Homelander.jpg");
    this.results.inputImageDataUrl = image.dataUrl;

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now();
      const session = await LanguageModel.create({ ...this.creationOptions, signal: this.abortSignal });
      this.results.inputContextSize = session.inputQuota;
      iterationResult.creationTime = performance.now() - start;

      const promptInput = [{
        role: "user",
        content: [
          { type: "text", value: "What emotion is the person in this image feeling? Provide a concise explanation." },
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
        const generationTime = (iterationResult.totalResponseTime || 0) - (iterationResult.timeToFirstToken || 0);
        iterationResult.tokensPerSecond = generationTime > 0 ? iterationResult.totalNumberOfOutputTokens / (generationTime / 1000) : 0;
      iterationResult.inputTokensPerSecond = (iterationResult.timeToFirstToken && iterationResult.totalNumberOfInputTokens) ? iterationResult.totalNumberOfInputTokens / (iterationResult.timeToFirstToken / 1000) : -1;
        iterationResult.charactersPerSecond = generationTime > 0 ? iterationResult.totalNumberOfOutputCharacters / (generationTime / 1000) : 0;
        iterationResult.inputLength = this.results.input?.length || 0;

        const lowerOut = output.toLowerCase();
        if (lowerOut.includes("disgust") || lowerOut.includes("repulsed") || lowerOut.includes("contempt")) {
           iterationResult.status = TestStatus.Success;
        } else {
           iterationResult.status = TestStatus.Error;
           iterationResult.output = `Validation Failed. Expected emotion to be disgust. Got: ${output}`;
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
