import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComparisonDataService } from './comparison-data.service';
import { GlobalFilterService } from './global-filter.service';

describe('ComparisonDataService', () => {
  let service: ComparisonDataService;
  let httpMock: HttpTestingController;
  let filterService: GlobalFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ComparisonDataService,
        GlobalFilterService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    filterService = TestBed.inject(GlobalFilterService);
    service = TestBed.inject(ComparisonDataService);
    httpMock = TestBed.inject(HttpTestingController);

    // The constructor auto-fires loadAvailableBaselinesIndex — consume that request
    const initReq = httpMock.expectOne('/data/baselines/index.json');
    initReq.flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('field derivation from index entries', () => {
    it('should derive hw from name when hw field is missing', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'apple-m4-litertlm', name: 'Apple M4 (LiteRT-LM)', executionType: 'GPU', model: 'Nano V3 4B' }
      ]);

      const dataReq = httpMock.expectOne('/data/baselines/apple-m4-litertlm.json');
      dataReq.flush({ results: { testsResults: [{ api: 'translator', testIterationResults: [{ status: 'Success', tokensPerSecond: 10 }] }] } });

      expect(service._allBaselines.length).toBe(1);
      expect(service._allBaselines[0].hw).toBe('Apple M4 (LiteRT-LM)');
    });

    it('should use explicit hw field when present', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'test', name: 'Display Name', hw: 'Custom HW', executionType: 'GPU', model: 'M1' }
      ]);

      const dataReq = httpMock.expectOne('/data/baselines/test.json');
      dataReq.flush({ results: { testsResults: [{ api: 'prompt', testIterationResults: [{ status: 'Success', tokensPerSecond: 5 }] }] } });

      expect(service._allBaselines[0].hw).toBe('Custom HW');
    });

    it('should derive compute from executionType when compute field is missing', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'test-gpu', name: 'Test GPU', executionType: 'GPU', model: 'M1' },
        { filename: 'test-cloud', name: 'Test Cloud', executionType: 'Cloud', model: 'M1' }
      ]);

      httpMock.expectOne('/data/baselines/test-gpu.json').flush({ results: { testsResults: [{ api: 'p', testIterationResults: [{ status: 'Success', tokensPerSecond: 1 }] }] } });
      httpMock.expectOne('/data/baselines/test-cloud.json').flush({ results: { testsResults: [{ api: 'p', testIterationResults: [{ status: 'Success', tokensPerSecond: 1 }] }] } });

      const gpu = service._allBaselines.find(b => b.id === 'test-gpu');
      const cloud = service._allBaselines.find(b => b.id === 'test-cloud');
      expect(gpu!.compute).toBe('GPU');
      expect(cloud!.compute).toBe('Cloud');
    });

    it('should default compute to CPU when both compute and executionType are missing', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'test-bare', name: 'Test', model: 'M1' }
      ]);

      httpMock.expectOne('/data/baselines/test-bare.json').flush({ results: { testsResults: [{ api: 'p', testIterationResults: [{ status: 'Success', tokensPerSecond: 1 }] }] } });

      expect(service._allBaselines[0].compute).toBe('CPU');
    });

    it('should derive engine as LITERT-LM from filename containing litertlm', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: '2026-04-05-apple-m1-max-64gb-litertlm', name: 'Apple M1 Max (LiteRT-LM)', executionType: 'GPU', model: 'Nano V3 4B' }
      ]);

      httpMock.expectOne('/data/baselines/2026-04-05-apple-m1-max-64gb-litertlm.json').flush({ results: { testsResults: [{ api: 'translator', testIterationResults: [{ status: 'Success', tokensPerSecond: 10 }] }] } });

      expect(service._allBaselines[0].engine).toBe('LITERT-LM');
    });

    it('should derive engine as LLM IE from filename containing llminferenceengine', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: '2026-04-05-apple-m1-max-64gb-llminferenceengine', name: 'Apple M1 Max (LLM IE)', executionType: 'GPU', model: 'Nano V3 4B' }
      ]);

      httpMock.expectOne('/data/baselines/2026-04-05-apple-m1-max-64gb-llminferenceengine.json').flush({ results: { testsResults: [{ api: 'translator', testIterationResults: [{ status: 'Success', tokensPerSecond: 10 }] }] } });

      expect(service._allBaselines[0].engine).toBe('LLM IE');
    });

    it('should default engine to Gemini API when filename has no engine marker', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: '2026-04-03_gemini_3.1_flash', name: 'Gemini 3.1 Flash', executionType: 'Cloud', model: 'Gemini 3.1 Flash' }
      ]);

      httpMock.expectOne('/data/baselines/2026-04-03_gemini_3.1_flash.json').flush({ results: { testsResults: [{ api: 'translator', testIterationResults: [{ status: 'Success', tokensPerSecond: 10 }] }] } });

      expect(service._allBaselines[0].engine).toBe('Gemini API');
    });

    it('should use explicit engine field when present', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'test-litertlm', name: 'Test', engine: 'Custom Engine', executionType: 'GPU', model: 'M1' }
      ]);

      httpMock.expectOne('/data/baselines/test-litertlm.json').flush({ results: { testsResults: [{ api: 'p', testIterationResults: [{ status: 'Success', tokensPerSecond: 1 }] }] } });

      // Even though filename contains "litertlm", explicit engine field takes precedence
      expect(service._allBaselines[0].engine).toBe('Custom Engine');
    });

    it('should never produce "Unknown" for hw, compute, or engine', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'bare-minimum', name: 'Bare Minimum Config' }
      ]);

      httpMock.expectOne('/data/baselines/bare-minimum.json').flush({ results: { testsResults: [{ api: 'p', testIterationResults: [{ status: 'Success', tokensPerSecond: 1 }] }] } });

      const b = service._allBaselines[0];
      expect(b.hw).not.toBe('Unknown');
      expect(b.compute).not.toBe('Unknown');
      expect(b.engine).not.toBe('Unknown');

      // Also verify the values that were derived
      expect(b.hw).toBe('Bare Minimum Config');
      expect(b.compute).toBe('CPU');
      expect(b.engine).toBe('Gemini API');
    });
  });

  describe('filter options should never contain Unknown for derived fields', () => {
    it('should set filter options without Unknown for hw/compute/engine', () => {
      service._allBaselines = [];
      service.loadAvailableBaselinesIndex();

      const req = httpMock.expectOne('/data/baselines/index.json');
      req.flush([
        { filename: 'test-litertlm', name: 'Apple M4', executionType: 'GPU', model: 'Nano V3 4B' },
        { filename: 'test-cloud', name: 'Gemini Flash', executionType: 'Cloud', model: 'Gemini 3.1 Flash' }
      ]);

      httpMock.expectOne('/data/baselines/test-litertlm.json').flush({ results: { testsResults: [{ api: 'translator', testIterationResults: [{ status: 'Success', tokensPerSecond: 10 }] }] } });
      httpMock.expectOne('/data/baselines/test-cloud.json').flush({ results: { testsResults: [{ api: 'translator', testIterationResults: [{ status: 'Success', tokensPerSecond: 5 }] }] } });

      expect(filterService.hardwareOptions).not.toContain('Unknown');
      expect(filterService.computeOptions).not.toContain('Unknown');
      expect(filterService.engineOptions).not.toContain('Unknown');
    });
  });

  describe('baselines getter filtering', () => {
    beforeEach(() => {
      service._allBaselines = [
        { id: 'b1', name: 'HW A', data: {}, hw: 'HW A', compute: 'GPU', engine: 'LITERT-LM', model: 'Nano V3 4B' },
        { id: 'b2', name: 'HW B', data: {}, hw: 'HW B', compute: 'Cloud', engine: 'Gemini API', model: 'Gemini 3.1 Flash' }
      ];
      filterService.setOptions(['HW A', 'HW B'], ['GPU', 'Cloud'], ['LITERT-LM', 'Gemini API'], ['Nano V3 4B', 'Gemini 3.1 Flash'], ['translator']);
    });

    it('should return all baselines when all filters selected', () => {
      expect(service.baselines.length).toBe(2);
    });

    it('should filter by hardware', () => {
      filterService.selectFilter('hardware', 'HW B', false);
      expect(service.baselines.length).toBe(1);
      expect(service.baselines[0].id).toBe('b1');
    });

    it('should filter by compute', () => {
      filterService.selectFilter('compute', 'GPU', false);
      expect(service.baselines.length).toBe(1);
      expect(service.baselines[0].id).toBe('b2');
    });

    it('should filter by engine', () => {
      filterService.selectFilter('engine', 'Gemini API', false);
      expect(service.baselines.length).toBe(1);
      expect(service.baselines[0].id).toBe('b1');
    });

    it('should filter by search query', () => {
      filterService.searchQuery = 'hw b';
      expect(service.baselines.length).toBe(1);
      expect(service.baselines[0].id).toBe('b2');
    });
  });

  describe('getSummaryResults', () => {
    it('should return undefined for missing data', () => {
      expect(service.getSummaryResults(null, 'translator', new Set(['t1']))).toBeUndefined();
      expect(service.getSummaryResults({}, 'translator', new Set(['t1']))).toBeUndefined();
    });

    it('should calculate averages from successful iterations', () => {
      const data = {
        results: {
          testsResults: [
            {
              id: 't1', api: 'translator',
              testIterationResults: [
                { status: 'Success', tokensPerSecond: 10, inputTokensPerSecond: 20, charactersPerSecond: 50, timeToFirstToken: 100, totalResponseTime: 500 },
                { status: 'Success', tokensPerSecond: 30, inputTokensPerSecond: 40, charactersPerSecond: 150, timeToFirstToken: 300, totalResponseTime: 1500 }
              ]
            }
          ]
        }
      };

      const result = service.getSummaryResults(data, 'translator', new Set(['t1']));
      expect(result).toBeDefined();
      expect(result!.averageTokenPerSecond).toBe(20);
      expect(result!.averageInputTokensPerSecond).toBe(30);
      expect(result!.averageCharactersPerSecond).toBe(100);
      expect(result!.averageTimeToFirstToken).toBe(200);
      expect(result!.averageTotalResponseTime).toBe(1000);
    });

    it('should ignore non-Success iterations', () => {
      const data = {
        results: {
          testsResults: [
            {
              id: 't1', api: 'translator',
              testIterationResults: [
                { status: 'Success', tokensPerSecond: 10, charactersPerSecond: 50, timeToFirstToken: 100, totalResponseTime: 500 },
                { status: 'Error', tokensPerSecond: 999, charactersPerSecond: 999, timeToFirstToken: 999, totalResponseTime: 999 }
              ]
            }
          ]
        }
      };

      const result = service.getSummaryResults(data, 'translator', new Set(['t1']));
      expect(result!.averageTokenPerSecond).toBe(10);
    });
  });
});
