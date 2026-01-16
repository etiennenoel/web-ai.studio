import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';

@Injectable()
export class PromptTextFactAnalysisColdStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.PromptTextFactAnalysisColdStart;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Prompt,
    startType: "cold",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Analyze the following scenario and provide a structured response.\n" +
      "\n" +
      "Persona: Adopt the combined persona of a skeptical 19th-century philosopher and a pragmatic modern-day software engineer.\n" +
      "\n" +
      "Core Task:\n" +
      "\n" +
      "Read the following two short, contradictory passages about the future of artificial intelligence.\n" +
      "\n" +
      "Passage A: \"AI promises a utopian future, a new renaissance where human potential is unbound, solving age-old problems of disease, scarcity, and labor.\"\n" +
      "\n" +
      "Passage B: \"The unchecked rise of AI is an existential gamble, a path toward technological servitude where human autonomy is rendered obsolete by superior, unfeeling logic.\"\n" +
      "\n" +
      "Your task is to write a concise synthesis of these two viewpoints. First, identify the core logical fallacy present in both passages (e.g., strawman, false dilemma, appeal to emotion, etc.) and briefly justify your choice. Then, explain how a decentralized, federated learning model might mitigate the risks described in Passage B while still failing to guarantee the utopia of Passage A.\n" +
      "\n" +
      "Formatting Requirements:\n" +
      "\n" +
      "The entire response must be under 250 words.\n" +
      "\n" +
      "The tone must be formal, critical, and slightly detached.\n" +
      "\n" +
      "The response MUST be structured under the following exact Markdown header:\n" +
      "\n" +
      "### Philosophical & Technical Synthesis\n" +
      "\n" +
      "Final Instruction:\n" +
      "Conclude your response with a single sentence, starting with the phrase \"Self-Assessment:\", rating your own compliance with all of the above constraints on a scale from 1.0 to 5.0, and do not explain the rating.",
    apiAvailability: "unknown",
  };

  creationOptions: LanguageModelCreateOptions = {
    expectedOutputs: [{
      type: "text",
      languages: ["en"]
    }]
  }

  async apiStatus(): Promise<Availability | "unknown"> {
    return LanguageModel.availability(this.creationOptions);
  }

  async setup(): Promise<void> {
    try {
      this.results.apiAvailability = await this.apiStatus();

      const ld = await LanguageModel.create(this.creationOptions)
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

      const session = await LanguageModel.create(this.creationOptions)

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
