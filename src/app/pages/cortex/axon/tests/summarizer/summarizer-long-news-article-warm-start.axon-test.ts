import {AxonTestInterface} from '../../interfaces/axon-test.interface';
import {BuiltInAiApi} from '../../../../../enums/built-in-ai-api.enum';
import {AxonTestResultInterface} from '../../interfaces/axon-test-result.interface';
import {Injectable} from '@angular/core';
import {AxonTestId} from '../../enums/axon-test-id.enum';
import {TestStatus} from '../../../../../enums/test-status.enum';
import {AxonTestResultCalculator} from '../../util/axon-test-result-calculator';

@Injectable()
export class SummarizerLongNewsArticleWarmStartAxonTest implements AxonTestInterface {
  id: AxonTestId = AxonTestId.SummarizerLongNewsArticleWarmStart;

  results: AxonTestResultInterface = {
    id: this.id,
    status: TestStatus.Idle,
    api: BuiltInAiApi.Summarizer,
    startType: "warm",
    numberOfIterations: 3,
    testIterationResults: [],
    input: "Dr. Alpaslan Özerdem, Dean of the Jimmy and Rosalynn Carter School for Peace and Conflict Resolution and professor of peace and conflict studies, recently visited Mason Korea to engage with faculty and students in the Conflict Analysis and Resolution program.\\nAs part of his visit, he delivered a lecture titled “Technology, Peacebuilding, and Future-Oriented Programs,” highlighting how digital transformation is reshaping peacebuilding and humanitarian aid, and emphasizing the need to empower youth as global changemakers through empathy, innovation, and cross-cultural collaboration.\\nIn a follow-up conversation, he reflected on the recent Youth Trilateral Leadership (YTL) Workshop, which he oversaw in partnership with the U.S. Embassy and Mason Korea. “The YTL workshop is significant because it empowers youth as peacebuilders, connects them with the role of technology in peace efforts, and fosters cross-cultural understanding among young people from Japan, Korea, and the U.S.—especially important given the historical tensions in East Asia,” he said.\\nDean Özerdem also shared plans to launch a Peace Tech Lab at Mason Korea. “As I explained in my talk, peace labs are for problem solving. I want to build peace labs in different countries, each focusing on different aspects of peace work,” he said. “I’ve had great discussions with Dean Park and Professor Wilson, and the Computer Game Design faculty here are also very interested. I want the lab here to explore how games can be used for teaching, problem solving, and peacebuilding.”\\nHe concluded, “We’re going to work on this over the summer, and I hope that within the next academic year, we’ll have good news to share with the community.”\\nDuring his visit, Dean Özerdem also took part in Mason Korea’s MOU signing ceremony with the Korean Association of Negotiation Studies (KANS). The agreement, signed by Mason Korea Dean Dr. Joshua Park, marks the beginning of a partnership to launch a new Advanced Negotiation Program and a commitment to collaborative research and academic exchange in conflict and negotiation studies.\\",
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

    let start = performance.now()
    const summarizer = await Summarizer.create({
      length: "medium",
      format: "plain-text",
      type: "key-points",
      outputLanguage: "en"
    })
    const creationTime = performance.now() - start;

    for (let iterationResult of this.results.testIterationResults) {
      iterationResult.status = TestStatus.Executing;
      start = performance.now()
      iterationResult.creationTime = creationTime

      const response = summarizer.summarizeStreaming(this.results.input);

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
