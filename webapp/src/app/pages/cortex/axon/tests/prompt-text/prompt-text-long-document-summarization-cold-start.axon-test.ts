import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';
import {
  LARGE_SUMMARIZATION_SYSTEM_PROMPT,
  LARGE_TECHNICAL_DOCUMENT_10K,
} from '../shared/large-context-summarization.data';

@Injectable()
export class PromptTextLongDocumentSummarizationColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptTextLongDocumentSummarizationColdStart;
  abortSignal?: AbortSignal;

  systemInput = LARGE_SUMMARIZATION_SYSTEM_PROMPT;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Prompt,
    startType: 'cold',
    numberOfIterations: 3,
    testIterationResults: [],
    input: LARGE_TECHNICAL_DOCUMENT_10K,
    apiAvailability: 'unknown',
  };

  creationOptions: any = {
    expectedInputs: [
      {
        type: 'text',
        languages: ['en'],
      },
    ],
    expectedOutputs: [
      {
        type: 'text',
        languages: ['en'],
      },
    ],
    initialPrompts: [{role: 'system', content: this.systemInput}],
  };

  async apiStatus(): Promise<Availability | 'unknown'> {
    return LanguageModel.availability(this.creationOptions);
  }

  async setup(): Promise<void> {
    try {
      this.results.apiAvailability = await this.apiStatus();

      const session = await LanguageModel.create({
        ...this.creationOptions,
        signal: this.abortSignal,
      });
      if (typeof (session as any).destroy === 'function') {
        (session as any).destroy();
      }
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

    const combinedInputText = `${this.systemInput}\n\n${this.results.input}`;

    for (const iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now();
      const session = await LanguageModel.create({
        ...this.creationOptions,
        signal: this.abortSignal,
      });

      try {
        this.results.inputContextSize = (session as any).contextWindow ?? session.inputQuota;
        iterationResult.creationTime = performance.now() - start;

        const response = session.promptStreaming(this.results.input, {
          signal: this.abortSignal,
        });

        let output = '';
        let chunkCount = 0;

        for await (const chunk of response) {
          chunkCount++;
          if (output === '') {
            iterationResult.timeToFirstToken = performance.now() - start;
          }
          output += chunk;
        }

        iterationResult.output = JSON.stringify(output);
        iterationResult.totalResponseTime = performance.now() - start;

        let inputTokens = combinedInputText.length;
        try {
          if (typeof (session as any).measureContextUsage === 'function') {
            inputTokens = await (session as any).measureContextUsage(combinedInputText);
          } else if (typeof (session as any).measureInputUsage === 'function') {
            inputTokens = await (session as any).measureInputUsage(combinedInputText);
          }
        } catch (e) {
          console.warn('Could not measure input usage', e);
        }

        iterationResult.totalNumberOfInputTokens = inputTokens;
        iterationResult.totalNumberOfOutputTokens = chunkCount;
        iterationResult.totalNumberOfOutputCharacters = iterationResult.output.length;

        const generationTime =
          (iterationResult.totalResponseTime || 0) - (iterationResult.timeToFirstToken || 0);
        if (chunkCount <= 1) {
          iterationResult.tokensPerSecond = -1;
          iterationResult.charactersPerSecond =
            (iterationResult.totalResponseTime || 0) > 0
              ? iterationResult.totalNumberOfOutputCharacters /
                ((iterationResult.totalResponseTime || 0) / 1000)
              : 0;
        } else {
          const effectiveTime =
            generationTime > 0 ? generationTime : iterationResult.totalResponseTime || 0;
          iterationResult.tokensPerSecond =
            effectiveTime > 0
              ? iterationResult.totalNumberOfOutputTokens / (effectiveTime / 1000)
              : 0;
          iterationResult.charactersPerSecond =
            effectiveTime > 0
              ? iterationResult.totalNumberOfOutputCharacters / (effectiveTime / 1000)
              : 0;
        }

        iterationResult.inputTokensPerSecond =
          iterationResult.timeToFirstToken && iterationResult.totalNumberOfInputTokens
            ? iterationResult.totalNumberOfInputTokens / (iterationResult.timeToFirstToken / 1000)
            : -1;
        iterationResult.inputLength = combinedInputText.length;
        iterationResult.status = TestStatus.Success;
      } finally {
        if (typeof (session as any).destroy === 'function') {
          (session as any).destroy();
        }
      }
    }

    AxonTestResultCalculator.calculate(this.results);
    return this.results;
  }

  async postRun(): Promise<void> {
    this.results.status = TestStatus.Success;
  }
}
