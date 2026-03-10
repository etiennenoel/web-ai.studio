import {AxonTestId} from './enums/axon-test-id.enum';
import {Injectable} from '@angular/core';
import {TestStatus} from '../../../enums/test-status.enum';
import {AxonTestInterface} from './interfaces/axon-test.interface';
import {
  LanguageDetectorShortStringColdStartAxonTest
} from './tests/language-detector/language-detector-short-string-cold-start.axon-test';
import {AxonResultInterface} from './interfaces/axon-result.interface';
import {BuiltInAiApi} from '../../../enums/built-in-ai-api.enum';
import {MathematicalCalculations} from './util/mathematical-calculations';
import {
  LanguageDetectorShortStringWarmStartAxonTest
} from './tests/language-detector/language-detector-short-string-warm-start.axon-test';
import {
  TranslatorShortStringEnglishToFrenchColdStartAxonTest
} from './tests/translator/translator-short-string-english-to-french-cold-start.axon-test';
import {
  TranslatorShortStringEnglishToFrenchWarmStartAxonTest
} from './tests/translator/translator-short-string-english-to-french-warm-start.axon-test';
import {
  SummarizerLongNewsArticleColdStartAxonTest
} from './tests/summarizer/summarizer-long-news-article-cold-start.axon-test';
import {
  SummarizerLongNewsArticleWarmStartAxonTest
} from './tests/summarizer/summarizer-long-news-article-warm-start.axon-test';
import {
  PromptTextFactAnalysisColdStartAxonTest
} from './tests/prompt-text/prompt-text-fact-analysis-cold-start.axon-test';
import {
  PromptTextEthicalAndCreativeColdStartAxonTest
} from './tests/prompt-text/prompt-text-ethical-and-creative-cold-start.axon-test';
import {
  PromptTextTechnicalChallengeStartAxonTest
} from './tests/prompt-text/prompt-text-technical-challenge-start.axon-test';
import { PromptImageOcrHandwrittenLetter1ColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-handwritten-letter-1-cold-start.axon-test';
import { PromptImageOcrHandwrittenLetter2ColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-handwritten-letter-2-cold-start.axon-test';
import { PromptImageOcrHandwrittenLetter3ColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-handwritten-letter-3-cold-start.axon-test';
import { PromptImageOcrHandwrittenName1ColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-handwritten-name-1-cold-start.axon-test';
import { PromptImageOcrHandwrittenName2ColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-handwritten-name-2-cold-start.axon-test';
import { PromptImageOcrHandwrittenName3ColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-handwritten-name-3-cold-start.axon-test';
import { PromptImageOcrComputerFontColdStartAxonTest } from './tests/prompt-image/prompt-image-ocr-computer-font-cold-start.axon-test';
import { PromptImageDescribeColdStartAxonTest } from './tests/prompt-image/prompt-image-describe-cold-start.axon-test';
import { PromptImageExplainMemeColdStartAxonTest } from './tests/prompt-image/prompt-image-explain-meme-cold-start.axon-test';
import { PromptImageExplainEmotionColdStartAxonTest } from './tests/prompt-image/prompt-image-explain-emotion-cold-start.axon-test';
import { PromptAudioTranscription119ColdStartAxonTest } from './tests/prompt-audio/prompt-audio-transcription-119-cold-start.axon-test';
import { PromptAudioTranscription4167ColdStartAxonTest } from './tests/prompt-audio/prompt-audio-transcription-4167-cold-start.axon-test';
import { PromptAudioTranscription46ColdStartAxonTest } from './tests/prompt-audio/prompt-audio-transcription-46-cold-start.axon-test';
import { PromptAudioTranscription5670ColdStartAxonTest } from './tests/prompt-audio/prompt-audio-transcription-5670-cold-start.axon-test';
import {AxonPreTestResultInterface} from './interfaces/axon-pre-test-result.interface';

@Injectable()
export class AxonTestSuiteExecutor {

  testIdMap: { [id in AxonTestId]: AxonTestInterface };

  testsSuite: AxonTestId[] = [
    AxonTestId.LanguageDetectorShortStringColdStart,
    AxonTestId.LanguageDetectorShortStringWarmStart,
    AxonTestId.TranslatorShortStringEnglishToFrenchColdStart,
    AxonTestId.TranslatorShortStringEnglishToFrenchWarmStart,
    AxonTestId.SummarizerLongNewsArticleColdStart,
    AxonTestId.SummarizerLongNewsArticleWarmStart,
    AxonTestId.PromptTextFactAnalysisColdStart,
    AxonTestId.PromptTextEthicalAndCreativeColdStart,
    AxonTestId.PromptTextTechnicalChallengeColdStart,
    AxonTestId.PromptImageOcrHandwrittenLetter1ColdStart,
    AxonTestId.PromptImageOcrHandwrittenLetter2ColdStart,
    AxonTestId.PromptImageOcrHandwrittenLetter3ColdStart,
    AxonTestId.PromptImageOcrHandwrittenName1ColdStart,
    AxonTestId.PromptImageOcrHandwrittenName2ColdStart,
    AxonTestId.PromptImageOcrHandwrittenName3ColdStart,
    AxonTestId.PromptImageOcrComputerFontColdStart,
    AxonTestId.PromptImageDescribeColdStart,
    AxonTestId.PromptImageExplainMemeColdStart,
    AxonTestId.PromptImageExplainEmotionColdStart,
    AxonTestId.PromptAudioTranscription119ColdStart,
    AxonTestId.PromptAudioTranscription4167ColdStart,
    AxonTestId.PromptAudioTranscription46ColdStart,
    AxonTestId.PromptAudioTranscription5670ColdStart,
  ];

  results: AxonResultInterface;

  preTestsStatus = TestStatus.Idle;

  constructor(
    private readonly languageDetectorShortStringColdStartAxonTest: LanguageDetectorShortStringColdStartAxonTest,
    private readonly languageDetectorShortStringWarmStartAxonTest: LanguageDetectorShortStringWarmStartAxonTest,
    private readonly translatorShortStringEnglishToFrenchColdStartAxonTest: TranslatorShortStringEnglishToFrenchColdStartAxonTest,
    private readonly translatorShortStringEnglishToFrenchWarmStartAxonTest: TranslatorShortStringEnglishToFrenchWarmStartAxonTest,
    private readonly summarizerLongNewsArticleWarmStartAxonTest: SummarizerLongNewsArticleWarmStartAxonTest,
    private readonly summarizerLongNewsArticleColdStartAxonTest: SummarizerLongNewsArticleColdStartAxonTest,
    private readonly promptTextFactAnalysisColdStartAxonTest: PromptTextFactAnalysisColdStartAxonTest,
    private readonly promptTextEthicalAndCreativeColdStartAxonTest: PromptTextEthicalAndCreativeColdStartAxonTest,
    private readonly promptTextTechnicalChallengeStartAxonTest: PromptTextTechnicalChallengeStartAxonTest,
    private readonly promptImageOcrHandwrittenLetter1ColdStartAxonTest: PromptImageOcrHandwrittenLetter1ColdStartAxonTest,
    private readonly promptImageOcrHandwrittenLetter2ColdStartAxonTest: PromptImageOcrHandwrittenLetter2ColdStartAxonTest,
    private readonly promptImageOcrHandwrittenLetter3ColdStartAxonTest: PromptImageOcrHandwrittenLetter3ColdStartAxonTest,
    private readonly promptImageOcrHandwrittenName1ColdStartAxonTest: PromptImageOcrHandwrittenName1ColdStartAxonTest,
    private readonly promptImageOcrHandwrittenName2ColdStartAxonTest: PromptImageOcrHandwrittenName2ColdStartAxonTest,
    private readonly promptImageOcrHandwrittenName3ColdStartAxonTest: PromptImageOcrHandwrittenName3ColdStartAxonTest,
    private readonly promptImageOcrComputerFontColdStartAxonTest: PromptImageOcrComputerFontColdStartAxonTest,
    private readonly promptImageDescribeColdStartAxonTest: PromptImageDescribeColdStartAxonTest,
    private readonly promptImageExplainMemeColdStartAxonTest: PromptImageExplainMemeColdStartAxonTest,
    private readonly promptImageExplainEmotionColdStartAxonTest: PromptImageExplainEmotionColdStartAxonTest,
    private readonly promptAudioTranscription119ColdStartAxonTest: PromptAudioTranscription119ColdStartAxonTest,
    private readonly promptAudioTranscription4167ColdStartAxonTest: PromptAudioTranscription4167ColdStartAxonTest,
    private readonly promptAudioTranscription46ColdStartAxonTest: PromptAudioTranscription46ColdStartAxonTest,
    private readonly promptAudioTranscription5670ColdStartAxonTest: PromptAudioTranscription5670ColdStartAxonTest,
  ) {

    this.testIdMap = {
      [AxonTestId.LanguageDetectorShortStringColdStart]: this.languageDetectorShortStringColdStartAxonTest,
      [AxonTestId.LanguageDetectorShortStringWarmStart]: this.languageDetectorShortStringWarmStartAxonTest,
      [AxonTestId.TranslatorShortStringEnglishToFrenchColdStart]: this.translatorShortStringEnglishToFrenchColdStartAxonTest,
      [AxonTestId.TranslatorShortStringEnglishToFrenchWarmStart]: this.translatorShortStringEnglishToFrenchWarmStartAxonTest,
      [AxonTestId.SummarizerLongNewsArticleColdStart]: this.summarizerLongNewsArticleColdStartAxonTest,
      [AxonTestId.SummarizerLongNewsArticleWarmStart]: this.summarizerLongNewsArticleWarmStartAxonTest,
      [AxonTestId.PromptTextFactAnalysisColdStart]: this.promptTextFactAnalysisColdStartAxonTest,
      [AxonTestId.PromptTextEthicalAndCreativeColdStart]: this.promptTextEthicalAndCreativeColdStartAxonTest,
      [AxonTestId.PromptTextTechnicalChallengeColdStart]: this.promptTextTechnicalChallengeStartAxonTest,
      [AxonTestId.PromptImageOcrHandwrittenLetter1ColdStart]: this.promptImageOcrHandwrittenLetter1ColdStartAxonTest,
      [AxonTestId.PromptImageOcrHandwrittenLetter2ColdStart]: this.promptImageOcrHandwrittenLetter2ColdStartAxonTest,
      [AxonTestId.PromptImageOcrHandwrittenLetter3ColdStart]: this.promptImageOcrHandwrittenLetter3ColdStartAxonTest,
      [AxonTestId.PromptImageOcrHandwrittenName1ColdStart]: this.promptImageOcrHandwrittenName1ColdStartAxonTest,
      [AxonTestId.PromptImageOcrHandwrittenName2ColdStart]: this.promptImageOcrHandwrittenName2ColdStartAxonTest,
      [AxonTestId.PromptImageOcrHandwrittenName3ColdStart]: this.promptImageOcrHandwrittenName3ColdStartAxonTest,
      [AxonTestId.PromptImageOcrComputerFontColdStart]: this.promptImageOcrComputerFontColdStartAxonTest,
      [AxonTestId.PromptImageDescribeColdStart]: this.promptImageDescribeColdStartAxonTest,
      [AxonTestId.PromptImageExplainMemeColdStart]: this.promptImageExplainMemeColdStartAxonTest,
      [AxonTestId.PromptImageExplainEmotionColdStart]: this.promptImageExplainEmotionColdStartAxonTest,
      [AxonTestId.PromptAudioTranscription119ColdStart]: this.promptAudioTranscription119ColdStartAxonTest,
      [AxonTestId.PromptAudioTranscription4167ColdStart]: this.promptAudioTranscription4167ColdStartAxonTest,
      [AxonTestId.PromptAudioTranscription46ColdStart]: this.promptAudioTranscription46ColdStartAxonTest,
      [AxonTestId.PromptAudioTranscription5670ColdStart]: this.promptAudioTranscription5670ColdStartAxonTest,
    }

    this.testsSuite.sort((a, b) => {
      const apiA = this.testIdMap[a].results.api;
      const apiB = this.testIdMap[b].results.api;
      if (apiA !== apiB) {
        const apisArray = Object.values(BuiltInAiApi);
        return apisArray.indexOf(apiA as BuiltInAiApi) - apisArray.indexOf(apiB as BuiltInAiApi);
      }
      return a.localeCompare(b, "en");
    });

    this.results = {
      status: TestStatus.Idle,
      testsResults: [],
    };
  }

  async forceSetup(testId: AxonTestId): Promise<void> {
    await this.testIdMap[testId].setup();
  }

  async setup(selectedTestIds?: Set<string>): Promise<void> {
    this.results.testsResults = [];
    this.preTestsStatus = TestStatus.Executing;

    const testsToRun = selectedTestIds && selectedTestIds.size > 0 
      ? this.testsSuite.filter(id => selectedTestIds.has(id))
      : this.testsSuite;

    for (const testSuite of this.testsSuite) {
      const test = this.testIdMap[testSuite];
      this.results.testsResults.push(test.results);
    }

    return new Promise(async (resolve, reject) => {
      // Check the status for each API.
      for (const testSuite of testsToRun) {
        const test = this.testIdMap[testSuite];
        await test.setup();
      }

      // Check if all setup for tests to run are in a final state
      if (!this.results.testsResults.filter(test => testsToRun.includes(test.id as AxonTestId)).find(test => {
        return test.apiAvailability === "downloadable" || test.apiAvailability === "downloading";
      })) {
        this.preTestsStatus = TestStatus.Success;
        return resolve();
      }

      await new Promise<void>( (resolve1) => {
        setTimeout(async () => {
          await this.setup(selectedTestIds);
          return resolve1();
        }, 3000);
      })

      return resolve();

    })
  }

  async start(selectedTestIds?: Set<string>): Promise<void> {
    this.results.status = TestStatus.Executing

    const testsToRun = selectedTestIds && selectedTestIds.size > 0 
      ? this.testsSuite.filter(id => selectedTestIds.has(id))
      : this.testsSuite;

    for (const testSuite of testsToRun) {
      const test = this.testIdMap[testSuite];

      await test.preRun();
      await test.run();
      await test.postRun();
    }

    // Compile the data
    // @ts-expect-error
    this.results.summary = {};

    for (const builtInAiAPI of Object.values(BuiltInAiApi)) {
      // @ts-expect-error
      this.results.summary[builtInAiAPI] = {
        "cold": {},
        "warm": {},
      }
      for (const startType of ["warm", "cold"]) {
        const items = this.results.testsResults.filter(value => {
          return value.api === builtInAiAPI && value.startType == startType;
        }).map(item => item.testIterationResults).flat(1)

        const summary = this.results.summary![builtInAiAPI][startType as "cold" | "warm"]!;

        summary.averageTokenPerSecond = MathematicalCalculations.calculateAverage(items.map(item => item.tokensPerSecond ?? 0));
        summary.averageTimeToFirstToken = MathematicalCalculations.calculateAverage(items.map(item => item.timeToFirstToken ?? 0));
        summary.averageTotalResponseTime = MathematicalCalculations.calculateAverage(items.map(item => item.totalResponseTime ?? 0));

        summary.medianTimeToFirstToken = MathematicalCalculations.calculateMedian(items.map(item => item.timeToFirstToken ?? 0));
        summary.medianTotalResponseTime = MathematicalCalculations.calculateMedian(items.map(item => item.totalResponseTime ?? 0));
        summary.medianTokenPerSecond = MathematicalCalculations.calculateMedian(items.map(item => item.tokensPerSecond ?? 0));
      }
    }

    this.results.status = TestStatus.Success;
  }
}
