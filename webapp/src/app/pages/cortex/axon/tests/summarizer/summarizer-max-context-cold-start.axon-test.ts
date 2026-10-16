import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';
import {
  fitDocumentToInputQuota,
  LARGE_TECHNICAL_DOCUMENT_10K,
} from '../shared/large-context-summarization.data';

@Injectable()
export class SummarizerMaxContextColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.SummarizerMaxContextColdStart;
  abortSignal?: AbortSignal;

  private fittedInputTokens?: number;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Summarizer,
    startType: 'cold',
    numberOfIterations: 3,
    testIterationResults: [],
    input: LARGE_TECHNICAL_DOCUMENT_10K,
    apiAvailability: 'unknown',
  };

  creationOptions: SummarizerCreateOptions = {
    length: 'medium',
    format: 'plain-text',
    type: 'key-points',
    expectedInputLanguages: ['en'],
    outputLanguage: 'en',
  };

  async apiStatus(): Promise<Availability | 'unknown'> {
    return Summarizer.availability(this.creationOptions);
  }

  async setup(): Promise<void> {
    try {
      this.results.apiAvailability = await this.apiStatus();

      const summarizer = await Summarizer.create({
        ...this.creationOptions,
        signal: this.abortSignal,
      });
      try {
        const fitted = await fitDocumentToInputQuota(summarizer, 0.85);
        this.results.input = fitted.text;
        this.fittedInputTokens = fitted.measuredTokens;
        this.results.inputContextSize = summarizer.inputQuota;
      } finally {
        if (typeof (summarizer as any).destroy === 'function') {
          (summarizer as any).destroy();
        }
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

    for (const iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;

      const start = performance.now();
      const summarizer = await Summarizer.create({
        ...this.creationOptions,
        signal: this.abortSignal,
      });

      try {
        this.results.inputContextSize = summarizer.inputQuota;
        iterationResult.creationTime = performance.now() - start;

        const response = summarizer.summarizeStreaming(this.results.input, {
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

        let inputTokens = this.fittedInputTokens ?? this.results.input.length;
        try {
          if (typeof (summarizer as any).measureInputUsage === 'function') {
            inputTokens = await (summarizer as any).measureInputUsage(this.results.input);
          } else if (typeof (summarizer as any).measureContextUsage === 'function') {
            inputTokens = await (summarizer as any).measureContextUsage(this.results.input);
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
        iterationResult.inputLength = this.results.input?.length || 0;
        iterationResult.status = TestStatus.Success;
      } finally {
        if (typeof (summarizer as any).destroy === 'function') {
          (summarizer as any).destroy();
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
