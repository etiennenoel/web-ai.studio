import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { CortexPage } from './cortex.page';
import { AxonTestSuiteExecutor } from './axon/axon-test-suite.executor';
import { ComparisonDataService } from './services/comparison-data.service';
import { AxonTestId } from './axon/enums/axon-test-id.enum';
import { TestStatus } from '../../enums/test-status.enum';

describe('CortexPage', () => {
  let component: CortexPage;
  let fixture: ComponentFixture<CortexPage>;
  let mockAxonTestSuiteExecutor: any;
  let mockComparisonService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockAxonTestSuiteExecutor = {
      results: { status: 0, testsResults: [] },
      preTestsStatus: 0,
      testsSuite: [],
      testIdMap: {}
    };

    mockComparisonService = {
      loadBaselineData: jasmine.createSpy('loadBaselineData'),
      baselines: [],
      availableBaselinesIndex: [],
      addBaseline: jasmine.createSpy('addBaseline'),
      removeBaseline: jasmine.createSpy('removeBaseline'),
      getGlobalSummaryResults: jasmine.createSpy('getGlobalSummaryResults'),
      getSummaryResults: jasmine.createSpy('getSummaryResults')
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [CortexPage],
      imports: [RouterTestingModule],
      providers: [
        { provide: AxonTestSuiteExecutor, useValue: mockAxonTestSuiteExecutor },
        { provide: ComparisonDataService, useValue: mockComparisonService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of({
              get: (key: string) => null // Mock getting parameters
            })
          }
        },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CortexPage);
    component = fixture.componentInstance;
    
    // Setup test map to avoid undefined
    const mockTestId = 'PromptTextFactAnalysisColdStart' as AxonTestId;
    component.axonTestSuiteExecutor.testIdMap = {
      [mockTestId]: {
        id: mockTestId,
        results: { id: mockTestId, status: TestStatus.Idle }
      }
    } as any;
    
    component.isExtensionInstalled = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadReport', () => {
    it('should parse JSON and update executor state', () => {
      const mockTestId = 'PromptTextFactAnalysisColdStart' as AxonTestId;
      const mockData = {
        results: {
          status: TestStatus.Success,
          testsResults: [
            { id: mockTestId, status: TestStatus.Success }
          ]
        },
        hardware: { cpu: 'Test CPU' },
        timestamp: '2023-01-01T00:00:00.000Z',
        userAgent: 'Test Agent'
      };

      // Ensure viewData exists
      component.viewData[mockTestId] = {};

      component.loadReport(mockData);

      expect(component.axonTestSuiteExecutor.results.status).toEqual(TestStatus.Success);
      expect(component.hardwareInfo).toEqual(mockData.hardware);
      expect(component.importedTimestamp).toEqual(mockData.timestamp);
      expect(component.importedUserAgent).toEqual(mockData.userAgent);
      expect(component.selectedTestIds.has(mockTestId)).toBeTrue();
      expect(component.isImportedReport).toBeTrue();
      expect(mockComparisonService.loadBaselineData).toHaveBeenCalledWith(mockData.hardware);
      expect(component.axonTestSuiteExecutor.testIdMap[mockTestId].results).toEqual(mockData.results.testsResults[0] as any);
    });

    it('should alert if format is invalid', () => {
      spyOn(window, 'alert');
      component.loadReport({});
      expect(window.alert).toHaveBeenCalledWith('Invalid report format');
    });
  });

  describe('toggleTest', () => {
    it('should toggle the expanded state of a test', () => {
      const testId = 'PromptTextFactAnalysisColdStart' as AxonTestId;
      component.viewData[testId] = { iterationsCollapsed: true };
      
      // Override isTestCollapsed dynamically if needed or just rely on the toggle output
      component.axonTestSuiteExecutor.testIdMap[testId] = { id: testId, results: { status: TestStatus.Idle } } as any;

      component.toggleTest(testId);
      
      expect(component.viewData[testId].iterationsCollapsed).toBeFalse();

      component.toggleTest(testId);
      
      expect(component.viewData[testId].iterationsCollapsed).toBeTrue();
    });
  });

  describe('saveReportToUrl', () => {
    it('should generate a shareable URL', fakeAsync(() => {
      // We will provide a simple mock for CompressionStream to make it pass in Jasmine/Karma
      const OriginalCompressionStream = (window as any).CompressionStream;
      (window as any).CompressionStream = class {
        writable = {};
        readable = {};
      };
      
      const OriginalResponse = window.Response;
      (window as any).Response = class {
        constructor(stream: any) {}
        arrayBuffer() {
          return Promise.resolve(new ArrayBuffer(8)); // Dummy buffer
        }
      };
      
      // We also need to mock blob.stream().pipeThrough
      const originalBlob = window.Blob;
      (window as any).Blob = class extends originalBlob {
        override stream() {
          return {
            pipeThrough: () => {
              return {}; // Returns a dummy stream
            }
          } as any;
        }
      }

      component.saveReportToUrl();
      tick(); // resolve async

      expect(component.isGeneratingUrl).toBeFalse();
      expect(component.showShareModal).toBeTrue();
      expect(component.generatedShareUrl).toBeTruthy();

      // Restore
      (window as any).CompressionStream = OriginalCompressionStream;
      (window as any).Response = OriginalResponse;
      (window as any).Blob = originalBlob;
    }));
  });

  describe('onFileSelected', () => {
    it('should parse a valid file', (done) => {
      const mockEvent = {
        target: {
          files: [new Blob(['{"results": {"testsResults": []}}'], { type: 'application/json' })],
          value: 'C:\\fakepath\\file.json'
        }
      };

      spyOn(component, 'loadReport');

      component.onFileSelected(mockEvent);

      // FileReader is async, we use a small timeout to let it fire `onload`
      setTimeout(() => {
        expect(component.loadReport).toHaveBeenCalledWith({ results: { testsResults: [] } });
        expect(mockEvent.target.value).toBe(''); // Input cleared
        done();
      }, 100);
    });

    it('should alert on invalid JSON file', (done) => {
      const mockEvent = {
        target: {
          files: [new Blob(['invalid json'], { type: 'application/json' })],
          value: 'C:\\fakepath\\file.json'
        }
      };

      spyOn(window, 'alert');
      spyOn(console, 'error');

      component.onFileSelected(mockEvent);

      setTimeout(() => {
        expect(window.alert).toHaveBeenCalledWith('Invalid JSON file');
        expect(console.error).toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
