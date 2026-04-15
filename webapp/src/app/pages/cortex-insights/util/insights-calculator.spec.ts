import { InsightsCalculator, IterationData, TestMetrics } from './insights-calculator';

describe('InsightsCalculator', () => {

  // --- Helper factory ---
  function makeIteration(overrides: Partial<IterationData> = {}): IterationData {
    return {
      status: 'Success',
      tokensPerSecond: 10,
      inputTokensPerSecond: 50,
      charactersPerSecond: 40,
      timeToFirstToken: 100,
      totalResponseTime: 500,
      totalNumberOfInputTokens: 200,
      totalNumberOfOutputTokens: 20,
      ...overrides,
    };
  }

  function makeTest(overrides: Partial<TestMetrics> = {}): TestMetrics {
    return {
      api: 'Prompt API',
      ttft: 100,
      speed: 10,
      inputSpeed: 50,
      charSpeed: 40,
      total: 500,
      avgInputTokens: 200,
      avgOutputTokens: 20,
      ...overrides,
    };
  }

  // =====================================================================
  // computeTestMetrics
  // =====================================================================
  describe('computeTestMetrics', () => {

    it('should compute averages from successful iterations', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ tokensPerSecond: 10, charactersPerSecond: 40, timeToFirstToken: 100, totalResponseTime: 500 }),
          makeIteration({ tokensPerSecond: 20, charactersPerSecond: 60, timeToFirstToken: 200, totalResponseTime: 600 }),
        ],
      }]);

      expect(results.length).toBe(1);
      expect(results[0].speed).toBe(15);      // (10 + 20) / 2
      expect(results[0].charSpeed).toBe(50);   // (40 + 60) / 2
      expect(results[0].ttft).toBe(150);       // (100 + 200) / 2
      expect(results[0].total).toBe(550);      // (500 + 600) / 2
    });

    it('should exclude failed iterations', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ status: 'Success', tokensPerSecond: 10 }),
          makeIteration({ status: 'Error', tokensPerSecond: 1000 }),
          makeIteration({ status: 'Fail', tokensPerSecond: 2000 }),
        ],
      }]);

      expect(results.length).toBe(1);
      expect(results[0].speed).toBe(10);
    });

    it('should exclude tokensPerSecond = -1 (non-streaming APIs)', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Translator',
        testIterationResults: [
          makeIteration({ tokensPerSecond: -1, charactersPerSecond: 100 }),
          makeIteration({ tokensPerSecond: -1, charactersPerSecond: 200 }),
        ],
      }]);

      expect(results.length).toBe(1);
      expect(results[0].speed).toBe(0);       // No valid values -> 0
      expect(results[0].charSpeed).toBe(150);  // (100 + 200) / 2
    });

    it('should exclude tokensPerSecond = 0 (no data)', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ tokensPerSecond: 0 }),
          makeIteration({ tokensPerSecond: 20 }),
        ],
      }]);

      expect(results.length).toBe(1);
      expect(results[0].speed).toBe(20); // Only the valid value
    });

    it('should exclude charactersPerSecond = 0 from charSpeed average', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ charactersPerSecond: 0 }),
          makeIteration({ charactersPerSecond: 100 }),
        ],
      }]);

      expect(results.length).toBe(1);
      expect(results[0].charSpeed).toBe(100); // Not (0 + 100) / 2 = 50
    });

    it('should exclude inputTokensPerSecond = -1', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Translator',
        testIterationResults: [
          makeIteration({ inputTokensPerSecond: -1 }),
          makeIteration({ inputTokensPerSecond: 100 }),
        ],
      }]);

      expect(results.length).toBe(1);
      expect(results[0].inputSpeed).toBe(100);
    });

    it('should group iterations by API', () => {
      const results = InsightsCalculator.computeTestMetrics([
        {
          api: 'Prompt API',
          testIterationResults: [makeIteration({ tokensPerSecond: 10 })],
        },
        {
          api: 'Prompt API',
          testIterationResults: [makeIteration({ tokensPerSecond: 30 })],
        },
        {
          api: 'Translator',
          testIterationResults: [makeIteration({ tokensPerSecond: -1, charactersPerSecond: 200 })],
        },
      ]);

      expect(results.length).toBe(2);
      const promptApi = results.find(r => r.api === 'Prompt API')!;
      const translator = results.find(r => r.api === 'Translator')!;
      expect(promptApi.speed).toBe(20); // (10 + 30) / 2
      expect(translator.speed).toBe(0);
      expect(translator.charSpeed).toBe(200);
    });

    it('should return empty array for empty input', () => {
      expect(InsightsCalculator.computeTestMetrics([])).toEqual([]);
    });

    it('should return empty array when all iterations failed', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ status: 'Error' }),
          makeIteration({ status: 'Fail' }),
        ],
      }]);

      expect(results.length).toBe(0);
    });

    it('should handle missing fields gracefully', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [{ status: 'Success' }], // All fields missing
      }]);

      expect(results.length).toBe(1);
      expect(results[0].speed).toBe(0);
      expect(results[0].inputSpeed).toBe(0);
      expect(results[0].charSpeed).toBe(0);
      expect(results[0].ttft).toBe(0);
      expect(results[0].total).toBe(0);
      expect(results[0].avgInputTokens).toBeUndefined();
      expect(results[0].avgOutputTokens).toBeUndefined();
    });

    it('should compute avgInputTokens and avgOutputTokens correctly', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ totalNumberOfInputTokens: 100, totalNumberOfOutputTokens: 10 }),
          makeIteration({ totalNumberOfInputTokens: 200, totalNumberOfOutputTokens: 30 }),
        ],
      }]);

      expect(results[0].avgInputTokens).toBe(150);  // (100 + 200) / 2
      expect(results[0].avgOutputTokens).toBe(20);   // (10 + 30) / 2
    });

    it('should exclude totalNumberOfOutputTokens = 0 from avgOutputTokens', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ totalNumberOfOutputTokens: 0 }),
          makeIteration({ totalNumberOfOutputTokens: 20 }),
        ],
      }]);

      expect(results[0].avgOutputTokens).toBe(20);
    });

    it('should return undefined for avgInputTokens when all values are 0', () => {
      const results = InsightsCalculator.computeTestMetrics([{
        api: 'Prompt API',
        testIterationResults: [
          makeIteration({ totalNumberOfInputTokens: 0 }),
        ],
      }]);

      expect(results[0].avgInputTokens).toBeUndefined();
    });

    // Real-world scenario: a mix of streaming and non-streaming APIs
    it('should handle a realistic baseline with mixed API types', () => {
      const results = InsightsCalculator.computeTestMetrics([
        // Prompt API (streaming, has token throughput)
        {
          api: 'Prompt API',
          testIterationResults: [
            makeIteration({ tokensPerSecond: 15, inputTokensPerSecond: 80, charactersPerSecond: 60, timeToFirstToken: 150, totalResponseTime: 800, totalNumberOfInputTokens: 300, totalNumberOfOutputTokens: 50 }),
            makeIteration({ tokensPerSecond: 25, inputTokensPerSecond: 120, charactersPerSecond: 100, timeToFirstToken: 100, totalResponseTime: 600, totalNumberOfInputTokens: 300, totalNumberOfOutputTokens: 70 }),
          ],
        },
        // Translator (non-streaming, tokensPerSecond = -1)
        {
          api: 'Translator',
          testIterationResults: [
            makeIteration({ tokensPerSecond: -1, inputTokensPerSecond: -1, charactersPerSecond: 500, timeToFirstToken: 50, totalResponseTime: 200, totalNumberOfInputTokens: 100, totalNumberOfOutputTokens: 80 }),
            makeIteration({ tokensPerSecond: -1, inputTokensPerSecond: -1, charactersPerSecond: 600, timeToFirstToken: 30, totalResponseTime: 180, totalNumberOfInputTokens: 100, totalNumberOfOutputTokens: 90 }),
          ],
        },
        // Language Detector (non-streaming, tokensPerSecond = -1)
        {
          api: 'Language Detector',
          testIterationResults: [
            makeIteration({ tokensPerSecond: -1, inputTokensPerSecond: -1, charactersPerSecond: 1000, timeToFirstToken: 10, totalResponseTime: 50, totalNumberOfInputTokens: 0, totalNumberOfOutputTokens: 0 }),
          ],
        },
      ]);

      expect(results.length).toBe(3);

      const prompt = results.find(r => r.api === 'Prompt API')!;
      expect(prompt.speed).toBe(20);       // (15 + 25) / 2
      expect(prompt.inputSpeed).toBe(100); // (80 + 120) / 2

      const translator = results.find(r => r.api === 'Translator')!;
      expect(translator.speed).toBe(0);    // All -1
      expect(translator.inputSpeed).toBe(0);
      expect(translator.charSpeed).toBe(550); // (500 + 600) / 2

      const detector = results.find(r => r.api === 'Language Detector')!;
      expect(detector.speed).toBe(0);
      expect(detector.avgInputTokens).toBeUndefined(); // All 0
      expect(detector.avgOutputTokens).toBeUndefined();
    });
  });

  // =====================================================================
  // aggregateTestMetrics
  // =====================================================================
  describe('aggregateTestMetrics', () => {

    it('should average across tests, excluding zero speeds', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ speed: 20, charSpeed: 100, ttft: 100, total: 500 }),
        makeTest({ speed: 0, charSpeed: 0, ttft: 50, total: 200 }), // Non-streaming API
      ]);

      expect(metrics.speed).toBe(20);     // Only the 20, not (20 + 0) / 2 = 10
      expect(metrics.charSpeed).toBe(100); // Only the 100, not (100 + 0) / 2 = 50
      expect(metrics.ttft).toBe(75);       // (100 + 50) / 2 - timing is always included
      expect(metrics.total).toBe(350);     // (500 + 200) / 2
    });

    it('should return 0 for speed when all tests have speed = 0', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ speed: 0 }),
        makeTest({ speed: 0 }),
      ]);

      expect(metrics.speed).toBe(0);
    });

    it('should exclude undefined avgInputTokens from average', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ avgInputTokens: 300 }),
        makeTest({ avgInputTokens: undefined }), // N/A API
      ]);

      expect(metrics.avgInputTokens).toBe(300); // Not (300 + 0) / 2 = 150
    });

    it('should exclude undefined avgOutputTokens from average', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ avgOutputTokens: 50 }),
        makeTest({ avgOutputTokens: undefined }),
      ]);

      expect(metrics.avgOutputTokens).toBe(50);
    });

    it('should return 0 for token counts when all are undefined', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ avgInputTokens: undefined, avgOutputTokens: undefined }),
      ]);

      expect(metrics.avgInputTokens).toBe(0);
      expect(metrics.avgOutputTokens).toBe(0);
    });

    it('should handle a single test', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ speed: 15, charSpeed: 60, ttft: 200, total: 1000 }),
      ]);

      expect(metrics.speed).toBe(15);
      expect(metrics.charSpeed).toBe(60);
      expect(metrics.ttft).toBe(200);
      expect(metrics.total).toBe(1000);
    });

    it('should handle empty input', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([]);

      expect(metrics.speed).toBe(0);
      expect(metrics.charSpeed).toBe(0);
      expect(metrics.ttft).toBe(0);
      expect(metrics.total).toBe(0);
      expect(metrics.avgInputTokens).toBe(0);
      expect(metrics.avgOutputTokens).toBe(0);
    });

    it('should round results to integers', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ speed: 10, charSpeed: 33 }),
        makeTest({ speed: 15, charSpeed: 67 }),
      ]);

      expect(metrics.speed).toBe(13);      // Math.round(12.5) = 13 (rounds up at .5)
      expect(metrics.charSpeed).toBe(50);   // (33 + 67) / 2 = 50
    });

    it('should exclude inputSpeed = 0 from average', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ inputSpeed: 0 }),    // API without input speed
        makeTest({ inputSpeed: 100 }),  // API with input speed
      ]);

      expect(metrics.inputSpeed).toBe(100); // Not (0 + 100) / 2 = 50
    });

    // The critical bug scenario: mixing Prompt API (has speed) with Translator/LanguageDetector (speed=0)
    it('should not let non-streaming API zeros drag down the speed average', () => {
      const metrics = InsightsCalculator.aggregateTestMetrics([
        makeTest({ api: 'Prompt API', speed: 20, charSpeed: 80, inputSpeed: 100 }),
        makeTest({ api: 'Translator', speed: 0, charSpeed: 500, inputSpeed: 0 }),
        makeTest({ api: 'Language Detector', speed: 0, charSpeed: 1000, inputSpeed: 0 }),
      ]);

      // speed should only average the Prompt API value (20), not (20 + 0 + 0) / 3 = 7
      expect(metrics.speed).toBe(20);
      // charSpeed should average all three since they all have positive values
      expect(metrics.charSpeed).toBe(527); // Math.round((80 + 500 + 1000) / 3)
      // inputSpeed should only average Prompt API
      expect(metrics.inputSpeed).toBe(100);
    });
  });

  // =====================================================================
  // computeFleetMetrics
  // =====================================================================
  describe('computeFleetMetrics', () => {

    it('should average across entries, excluding zero speeds', () => {
      const fleet = InsightsCalculator.computeFleetMetrics([
        { speed: 20, inputSpeed: 100, charSpeed: 80, ttft: 100, total: 500, avgInputTokens: 0, avgOutputTokens: 0 },
        { speed: 30, inputSpeed: 0, charSpeed: 120, ttft: 200, total: 1000, avgInputTokens: 0, avgOutputTokens: 0 },
      ]);

      expect(fleet.avgSpeed).toBe(25);      // (20 + 30) / 2
      expect(fleet.avgInputSpeed).toBe(100); // Only first entry (second is 0)
      expect(fleet.avgCharSpeed).toBe(100);  // (80 + 120) / 2
      expect(fleet.avgTtft).toBe(150);       // (100 + 200) / 2
    });

    it('should return 0 for all metrics when input is empty', () => {
      const fleet = InsightsCalculator.computeFleetMetrics([]);

      expect(fleet.avgSpeed).toBe(0);
      expect(fleet.avgInputSpeed).toBe(0);
      expect(fleet.avgCharSpeed).toBe(0);
      expect(fleet.avgTtft).toBe(0);
    });

    it('should exclude entries with speed = 0 from avgSpeed', () => {
      const fleet = InsightsCalculator.computeFleetMetrics([
        { speed: 0, inputSpeed: 0, charSpeed: 0, ttft: 100, total: 500, avgInputTokens: 0, avgOutputTokens: 0 },
        { speed: 40, inputSpeed: 80, charSpeed: 160, ttft: 200, total: 1000, avgInputTokens: 0, avgOutputTokens: 0 },
      ]);

      expect(fleet.avgSpeed).toBe(40);       // Only the 40
      expect(fleet.avgCharSpeed).toBe(160);   // Only the 160
      expect(fleet.avgTtft).toBe(150);        // (100 + 200) / 2 - always includes all
    });

    it('should return 0 when all speeds are 0', () => {
      const fleet = InsightsCalculator.computeFleetMetrics([
        { speed: 0, inputSpeed: 0, charSpeed: 0, ttft: 100, total: 500, avgInputTokens: 0, avgOutputTokens: 0 },
      ]);

      expect(fleet.avgSpeed).toBe(0);
      expect(fleet.avgInputSpeed).toBe(0);
      expect(fleet.avgCharSpeed).toBe(0);
    });

    it('should handle single entry', () => {
      const fleet = InsightsCalculator.computeFleetMetrics([
        { speed: 15, inputSpeed: 50, charSpeed: 60, ttft: 150, total: 700, avgInputTokens: 0, avgOutputTokens: 0 },
      ]);

      expect(fleet.avgSpeed).toBe(15);
      expect(fleet.avgInputSpeed).toBe(50);
      expect(fleet.avgCharSpeed).toBe(60);
      expect(fleet.avgTtft).toBe(150);
    });
  });

  // =====================================================================
  // End-to-end: computeTestMetrics -> aggregateTestMetrics -> computeFleetMetrics
  // =====================================================================
  describe('end-to-end pipeline', () => {

    it('should produce correct fleet metrics from raw iteration data', () => {
      // Baseline 1: Prompt API (streaming) + Translator (non-streaming)
      const baseline1Tests = InsightsCalculator.computeTestMetrics([
        {
          api: 'Prompt API',
          testIterationResults: [
            makeIteration({ tokensPerSecond: 20, charactersPerSecond: 80, inputTokensPerSecond: 100, timeToFirstToken: 100, totalResponseTime: 500 }),
          ],
        },
        {
          api: 'Translator',
          testIterationResults: [
            makeIteration({ tokensPerSecond: -1, charactersPerSecond: 500, inputTokensPerSecond: -1, timeToFirstToken: 50, totalResponseTime: 200 }),
          ],
        },
      ]);

      // Baseline 2: Prompt API only
      const baseline2Tests = InsightsCalculator.computeTestMetrics([
        {
          api: 'Prompt API',
          testIterationResults: [
            makeIteration({ tokensPerSecond: 30, charactersPerSecond: 120, inputTokensPerSecond: 150, timeToFirstToken: 80, totalResponseTime: 400 }),
          ],
        },
      ]);

      const agg1 = InsightsCalculator.aggregateTestMetrics(baseline1Tests);
      const agg2 = InsightsCalculator.aggregateTestMetrics(baseline2Tests);

      // Baseline 1: speed should be 20 (only Prompt API), not (20 + 0) / 2 = 10
      expect(agg1.speed).toBe(20);
      // Baseline 1: charSpeed should be (80 + 500) / 2 = 290
      expect(agg1.charSpeed).toBe(290);
      // Baseline 2: speed = 30
      expect(agg2.speed).toBe(30);

      const fleet = InsightsCalculator.computeFleetMetrics([agg1, agg2]);
      // Fleet speed: (20 + 30) / 2 = 25
      expect(fleet.avgSpeed).toBe(25);
    });

    it('should not skew when all APIs in a baseline are non-streaming', () => {
      const tests = InsightsCalculator.computeTestMetrics([
        {
          api: 'Translator',
          testIterationResults: [
            makeIteration({ tokensPerSecond: -1, charactersPerSecond: 500 }),
          ],
        },
        {
          api: 'Language Detector',
          testIterationResults: [
            makeIteration({ tokensPerSecond: -1, charactersPerSecond: 1000 }),
          ],
        },
      ]);

      const agg = InsightsCalculator.aggregateTestMetrics(tests);
      expect(agg.speed).toBe(0); // No streaming APIs -> speed is 0, not averaged with zeros

      // This entry should be excluded from fleet speed avg
      const fleet = InsightsCalculator.computeFleetMetrics([
        agg,
        { speed: 40, inputSpeed: 0, charSpeed: 200, ttft: 100, total: 400, avgInputTokens: 0, avgOutputTokens: 0 },
      ]);

      expect(fleet.avgSpeed).toBe(40); // Not (0 + 40) / 2 = 20
    });

    it('should handle LM Studio single-chunk scenario correctly', () => {
      // LM Studio returns everything as 1 chunk: tokensPerSecond = -1, but has charSpeed
      const tests = InsightsCalculator.computeTestMetrics([
        {
          api: 'Prompt API',
          testIterationResults: [
            makeIteration({ tokensPerSecond: -1, charactersPerSecond: 300, totalNumberOfOutputTokens: 1 }),
            makeIteration({ tokensPerSecond: -1, charactersPerSecond: 350, totalNumberOfOutputTokens: 1 }),
          ],
        },
      ]);

      expect(tests[0].speed).toBe(0);         // All -1 -> 0
      expect(tests[0].charSpeed).toBe(325);    // (300 + 350) / 2

      const agg = InsightsCalculator.aggregateTestMetrics(tests);
      expect(agg.speed).toBe(0);
      expect(agg.charSpeed).toBe(325);
    });
  });
});
