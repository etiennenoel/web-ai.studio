import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';

@Injectable()
export class PromptTextTechnicalChallengeStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptTextTechnicalChallengeColdStart;
  abortSignal?: AbortSignal;

  systemInput = "Adopt the persona of a senior software engineer conducting a code review. Your feedback should be direct and practical.";

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Prompt,
    startType: "cold",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Provide a structured response to the following technical challenge.\n" +
      "\n" +
      "Core Tasks:\n" +
      "\n" +
      "Code Generation: Generate a short, commented code snippet in JavaScript (no more than 10 lines) that correctly demonstrates a Promise.race().\n" +
      "\n" +
      "Explanation: Immediately after the code, explain a clear, real-world scenario where this specific function would be more useful than Promise.all().\n" +
      "\n" +
      "Formatting Requirements:\n" +
      "\n" +
      "The code must be valid and commented.\n" +
      "\n" +
      "The tone should be professional and instructional.\n" +
      "\n" +
      "The response MUST be structured under the following exact Markdown header:\n" +
      "\n" +
      "### Asynchronous Demonstration\n" +
      "\n" +
      "Final Instruction:\n" +
      "Conclude your response with a single sentence, starting with the phrase \"Self-Assessment:\", rating your own compliance with all of the above constraints on a scale from 1.0 to 5.0, and do not explain the rating.",
    apiAvailability: "unknown",
  };

  creationOptions: any = {
    expectedOutputs: [{
      type: "text",
      languages: ["en"]
    }],
    initialPrompts: [{role: "system", content: this.systemInput}]
  }

  async apiStatus(): Promise<Availability | "unknown"> {
    return LanguageModel.availability(this.creationOptions);
  }

  async setup(): Promise<void> {
    try {
      this.results.apiAvailability = await this.apiStatus();

      const ld = await LanguageModel.create({ ...this.creationOptions, signal: this.abortSignal })
    } catch (e) {
      this.results.status = TestStatus.Error;
    }
  }

  async preRun(): Promise<void> {
    this.results.status = TestStatus.Executing;
    this.results.testIterationResults = [];
  }

  async run(): Promise<AxonTestResultInterface> {
    // Create all the iterations first.
    for (let i = 0; i < this.results.numberOfIterations; i++) {
      this.results.testIterationResults.push({
        status: TestStatus.Idle,
      });
    }

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now()

      const session = await LanguageModel.create({ ...this.creationOptions, signal: this.abortSignal })
      this.results.inputContextSize = session.inputQuota;

      iterationResult.creationTime = performance.now() - start;

      const response = session.promptStreaming(this.results.input, { signal: this.abortSignal });

      let output = "";
      let chunkCount = 0;

      for await (const chunk of response) {

        chunkCount++;
        if(output === "") {
          iterationResult.timeToFirstToken = performance.now() - start;
        }

        output += chunk;
      }

      iterationResult.output = JSON.stringify(output);
      iterationResult.totalResponseTime = performance.now() - start;
      let inputTokens = this.results.input.length;
      try {
        if (typeof (session as any).measureInputUsage === 'function') {
          inputTokens = await (session as any).measureInputUsage(this.results.input);
        } else if (typeof (session as any).measureContextUsage === 'function') {
          inputTokens = await (session as any).measureContextUsage(this.results.input);
        }
      } catch (e) {
        console.warn('Could not measure input usage', e);
      }
      iterationResult.totalNumberOfInputTokens = inputTokens;
      iterationResult.totalNumberOfOutputTokens = chunkCount;
      iterationResult.totalNumberOfOutputCharacters = iterationResult.output.length;
      const generationTime = (iterationResult.totalResponseTime || 0) - (iterationResult.timeToFirstToken || 0);
      if (chunkCount <= 1) {
        iterationResult.tokensPerSecond = -1;
        iterationResult.charactersPerSecond = (iterationResult.totalResponseTime || 0) > 0 ? iterationResult.totalNumberOfOutputCharacters / ((iterationResult.totalResponseTime || 0) / 1000) : 0;
      } else {
        const effectiveTime = generationTime > 0 ? generationTime : (iterationResult.totalResponseTime || 0);
        iterationResult.tokensPerSecond = effectiveTime > 0 ? iterationResult.totalNumberOfOutputTokens / (effectiveTime / 1000) : 0;
        iterationResult.charactersPerSecond = effectiveTime > 0 ? iterationResult.totalNumberOfOutputCharacters / (effectiveTime / 1000) : 0;
      }
      iterationResult.inputTokensPerSecond = (iterationResult.timeToFirstToken && iterationResult.totalNumberOfInputTokens) ? iterationResult.totalNumberOfInputTokens / (iterationResult.timeToFirstToken / 1000) : -1;
      iterationResult.inputLength = this.results.input?.length || 0;

      // Validate the output of the test here before setting the result.
      iterationResult.status = TestStatus.Success;
    }

    AxonTestResultCalculator.calculate(this.results);

    return this.results;
  }

  async postRun(): Promise<void> {
    this.results.status = TestStatus.Success
  }
}
