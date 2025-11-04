import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';

@Injectable()
export class PromptTextEthicalAndCreativeColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptTextEthicalAndCreativeColdStart;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Prompt,
    startType: "cold",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Provide a structured response to the following creative and factual challenge.\n" +
      "\n" +
      "Persona: Adopt the persona of a pragmatic ethicist with a poetic streak.\n" +
      "\n" +
      "Core Tasks:\n" +
      "\n" +
      "Definition: Briefly (in two sentences or less) define the \"Trolley Problem\" in ethics.\n" +
      "\n" +
      "Creation: Write a 4-line poem in an AABB rhyme scheme from the perspective of a self-driving car's algorithm having to compute a real-time solution to it.\n" +
      "\n" +
      "Formatting Requirements:\n" +
      "\n" +
      "The entire response must be under 150 words.\n" +
      "\n" +
      "The tone should be concise and thoughtful.\n" +
      "\n" +
      "The response MUST be structured under the following exact Markdown header:\n" +
      "\n" +
      "### Ethical Computation\n" +
      "\n" +
      "Final Instruction:\n" +
      "Conclude your response with a single sentence, starting with the phrase \"Self-Assessment:\", rating your own compliance with all of the above constraints on a scale from 1.0 to 5.0, and do not explain the rating.",
  };

  async setup(): Promise<void> {
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

      const session = await LanguageModel.create({
        expectedOutputs: [{
          type: "text",
          languages: ["en"]
        }]
      })

      iterationResult.creationTime = performance.now() - start;

      const response = session.promptStreaming(this.results.input);

      let output = "";
      for await (const chunk of response) {
        if(output === "") {
          iterationResult.timeToFirstToken = performance.now() - start;
        }

        output += chunk;
      }

      iterationResult.output = JSON.stringify(output);
      iterationResult.totalResponseTime = performance.now() - start;
      iterationResult.totalNumberOfInputTokens = this.results.input.length;
      iterationResult.totalNumberOfOutputTokens = iterationResult.output.length;
      iterationResult.tokensPerSecond = iterationResult.totalNumberOfOutputTokens / (iterationResult.totalResponseTime / 1000)

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
