import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { CortexPage } from './cortex.page';
import { AxonTestSuiteExecutor } from './axon/axon-test-suite.executor';
import { ComparisonDataService } from './services/comparison-data.service';
import { GlobalFilterService } from './services/global-filter.service';
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
      baselines: [],
      _allBaselines: [],
      availableBaselinesIndex: [],
      getGlobalSummaryResults: jasmine.createSpy('getGlobalSummaryResults'),
      getSummaryResults: jasmine.createSpy('getSummaryResults'),
      loadAvailableBaselinesIndex: jasmine.createSpy('loadAvailableBaselinesIndex')
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [CortexPage],
      imports: [RouterTestingModule],
      providers: [
        GlobalFilterService,
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

  describe('loadReportFromUrl', () => {
    it('should decompress and load report', fakeAsync(() => {
      spyOn(component, 'loadReport');
      
      const originalDecompressionStream = (window as any).DecompressionStream;
      (window as any).DecompressionStream = class {
        writable = {};
        readable = {};
      };
      
      const OriginalResponse = window.Response;
      (window as any).Response = class {
        constructor(stream: any) {}
        text() {
          return Promise.resolve('{"results": {"testsResults": []}}');
        }
      };
      
      const originalBlob = window.Blob;
      (window as any).Blob = class extends originalBlob {
        override stream() {
          return {
            pipeThrough: () => ({})
          } as any;
        }
      }

      // Valid base64url payload
      component.loadReportFromUrl('dGVzdA');
      tick();

      expect(component.loadReport).toHaveBeenCalledWith({ results: { testsResults: [] } });

      (window as any).DecompressionStream = originalDecompressionStream;
      (window as any).Response = OriginalResponse;
      (window as any).Blob = originalBlob;
    }));

    it('should alert and clear url on error', fakeAsync(() => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      
      // Invalid base64
      component.loadReportFromUrl('!!!!');
      tick();

      expect(window.alert).toHaveBeenCalledWith('Failed to load report from URL. The link might be broken or expired.');
      expect(console.error).toHaveBeenCalled();
    }));
  });

  describe('Hardware Information Formatting', () => {
    it('should format compute unit', () => {
      component.hardwareInfo = { cpu: { modelName: 'Test CPU', numOfProcessors: 4 } };
      fixture.detectChanges();
      expect(component.getComputeUnit()).toBe('Test CPU (4-Core)');
      
      component.hardwareInfo = { cpu: { modelName: 'Test CPU' } };
      fixture.detectChanges();
      expect(component.getComputeUnit()).toBe('Test CPU');

      component.hardwareInfo = null;
      fixture.detectChanges();
      expect(component.getComputeUnit()).toBe('Extension Required');
    });

    it('should determine NPU info', () => {
      component.hardwareInfo = { cpu: { modelName: 'Apple M1' } };
      fixture.detectChanges();
      expect(component.getNpuInfo()).toBe('Apple Neural Engine');

      component.hardwareInfo = { cpu: { modelName: 'Snapdragon X' } };
      fixture.detectChanges();
      expect(component.getNpuInfo()).toBe('Qualcomm Hexagon');

      component.hardwareInfo = { cpu: { modelName: 'Intel Core' } };
      fixture.detectChanges();
      expect(component.getNpuInfo()).toBe('Intel NPU (if available)');

      component.hardwareInfo = { cpu: { modelName: 'AMD Ryzen' } };
      fixture.detectChanges();
      expect(component.getNpuInfo()).toBe('AMD Ryzen AI (if available)');

      component.hardwareInfo = { cpu: { modelName: 'Generic CPU' } };
      fixture.detectChanges();
      expect(component.getNpuInfo()).toBe('Unknown or None');
    });

    it('should format memory info', () => {
      component.hardwareInfo = { memory: { capacity: 17179869184 } }; // 16GB
      fixture.detectChanges();
      expect(component.getMemoryInfo()).toBe('16 GB RAM');

      component.hardwareInfo = null;
      fixture.detectChanges();
      expect(component.getMemoryInfo()).toBe('Extension Required');
    });

    it('should format OS profile', () => {
      // Mocking navigator properties can be tricky depending on the test environment.
      // We will spy on the methods if they call external, but here we can mock by redefining on the component instance if possible, or use spyOnProperty.
      const userAgentSpy = spyOnProperty(window.navigator, 'userAgent', 'get');
      const userAgentDataSpy = (window.navigator as any).userAgentData !== undefined ? spyOnProperty(window.navigator as any, 'userAgentData', 'get') : null;
      
      if (userAgentDataSpy) userAgentDataSpy.and.returnValue(undefined);
      
      userAgentSpy.and.returnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      expect(component.getOsProfile()).toBe('macOS 10.15.7');

      userAgentSpy.and.returnValue('Windows NT 10.0');
      expect(component.getOsProfile()).toBe('Windows 10/11');

      userAgentSpy.and.returnValue('Linux');
      expect(component.getOsProfile()).toBe('Linux');

      userAgentSpy.and.returnValue('Android');
      expect(component.getOsProfile()).toBe('Android');

      userAgentSpy.and.returnValue('iPhone');
      expect(component.getOsProfile()).toBe('iOS / iPadOS');
    });

    it('should format Browser info', () => {
      const userAgentSpy = spyOnProperty(window.navigator, 'userAgent', 'get');
      const userAgentDataSpy = (window.navigator as any).userAgentData !== undefined ? spyOnProperty(window.navigator as any, 'userAgentData', 'get') : null;
      
      if (userAgentDataSpy) userAgentDataSpy.and.returnValue(undefined);

      userAgentSpy.and.returnValue('Chrome/100.0.0.0');
      expect(component.getBrowserInfo()).toBe('Chrome 100.0.0.0');

      userAgentSpy.and.returnValue('Edg/100.0.0.0');
      expect(component.getBrowserInfo()).toBe('Edge 100.0.0.0');
    });
  });

  describe('Calculations and Comparisons', () => {
    beforeEach(() => {
      const mockTestId = 'PromptTextFactAnalysisColdStart' as AxonTestId;
      component.selectedTestIds.add(mockTestId);
      component.axonTestSuiteExecutor.results = {
        status: TestStatus.Success,
        testsResults: [
          {
            id: mockTestId,
            api: 'prompt' as any,
            startType: 'cold',
            testIterationResults: [
              { status: TestStatus.Success, tokensPerSecond: 10, charactersPerSecond: 50, timeToFirstToken: 100, totalResponseTime: 500 },
              { status: TestStatus.Success, tokensPerSecond: 20, charactersPerSecond: 100, timeToFirstToken: 200, totalResponseTime: 1000 }
            ]
          } as any
        ]
      };
      fixture.detectChanges();
    });

    it('should calculate global summary results', () => {
      const results = component.getGlobalSummaryResults('cold');
      expect(results?.averageTokenPerSecond).toBe(15);
      expect(results?.medianTokenPerSecond).toBe(15);
    });

    it('should calculate summary results for a specific test', () => {
      const mockTestId = 'PromptTextFactAnalysisColdStart' as AxonTestId;
      // In component getSummaryResults uses builtInAIApi string and startType
      const results = component.getSummaryResults('prompt', 'cold');
      expect(results?.averageTokenPerSecond).toBe(15);
      expect(results?.medianTokenPerSecond).toBe(15);
    });

    it('should determine winner correctly', () => {
      expect(component.isWinner(15, [10, 15, 20], 'speed')).toBeFalse();
      expect(component.isWinner(20, [10, 15, 20], 'speed')).toBeTrue();
      expect(component.isWinner(100, [100, 200, 300], 'ttft')).toBeTrue();
      expect(component.isWinner(200, [100, 200, 300], 'ttft')).toBeFalse();
    });
  });

  describe('UI State Methods', () => {
    it('should return api collapsed state', () => {
      const api = 'prompt' as any;
      const progress = { percentage: 0 };
      
      // Default
      expect(component.isApiCollapsed(api, progress)).toBeTrue();

      // Explicitly set
      component.apiCollapsedState[api] = false;
      expect(component.isApiCollapsed(api, progress)).toBeFalse();

      component.apiCollapsedState = {};
      component.axonTestSuiteExecutor.results.status = TestStatus.Executing;
      fixture.detectChanges();
      
      // If none explicitly expanded, it should be true when percentage 0
      expect(component.isApiCollapsed(api, progress)).toBeTrue();

      progress.percentage = 50;
      const spy = spyOnProperty(component, 'currentExecutingTest').and.returnValue({ results: { api } } as any);
      expect(component.isApiCollapsed(api, progress)).toBeFalse();

      progress.percentage = 100;
      spy.and.returnValue(undefined as any);
      expect(component.isApiCollapsed(api, progress)).toBeTrue();
    });

    it('should return test collapsed state', () => {
      const mockTestId = 'PromptTextFactAnalysisColdStart' as AxonTestId;
      component.viewData[mockTestId] = {};
      const test = { id: mockTestId, results: { status: TestStatus.Idle } } as any;

      // Default
      expect(component.isTestCollapsed(test)).toBeTrue();

      // Explicit
      component.viewData[mockTestId].iterationsCollapsed = false;
      expect(component.isTestCollapsed(test)).toBeFalse();

      // Expanded output
      component.viewData[mockTestId].iterationsCollapsed = undefined;
      component.viewData[mockTestId].expandedOutputs = { 0: true };
      expect(component.isTestCollapsed(test)).toBeFalse();

      component.viewData[mockTestId].expandedOutputs = { 0: false };
      test.results.status = TestStatus.Executing;
      expect(component.isTestCollapsed(test)).toBeFalse();
    });
  });

  describe('Share Modal', () => {
    it('should open share modal when saveReportToUrl is called', fakeAsync(() => {
      const OriginalCompressionStream = (window as any).CompressionStream;
      (window as any).CompressionStream = class {
        writable = {};
        readable = {};
      };

      const OriginalResponse = window.Response;
      (window as any).Response = class {
        constructor(stream: any) {}
        arrayBuffer() {
          return Promise.resolve(new ArrayBuffer(8));
        }
      };

      const originalBlob = window.Blob;
      (window as any).Blob = class extends originalBlob {
        override stream() {
          return {
            pipeThrough: () => ({})
          } as any;
        }
      }

      component.saveReportToUrl();
      tick();

      expect(component.showShareModal).toBeTrue();

      (window as any).CompressionStream = OriginalCompressionStream;
      (window as any).Response = OriginalResponse;
      (window as any).Blob = originalBlob;
    }));

    it('should close share modal and reset state', () => {
      component.showShareModal = true;
      component.isUrlCopied = true;
      component.generatedShareUrl = 'http://test.com';

      component.closeShareModal();

      expect(component.showShareModal).toBeFalse();
      expect(component.isUrlCopied).toBeFalse();
    });

    it('should copy URL to clipboard', async () => {
      component.generatedShareUrl = 'http://test.com/share';

      const writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

      await component.copyShareUrl();

      expect(writeTextSpy).toHaveBeenCalledWith('http://test.com/share');
      expect(component.isUrlCopied).toBeTrue();
    });
  });

  describe('Filter State', () => {
    it('should reflect correct filter service state for all selected', () => {
      component.filterService.hardwareOptions = ['All', 'HW1', 'HW2'];
      component.filterService.selectedHardwares = ['All', 'HW1', 'HW2'];

      // When all selected, length should equal options length
      expect(component.filterService.selectedHardwares.length).toBe(component.filterService.hardwareOptions.length);
    });

    it('should reflect partial selection correctly', () => {
      component.filterService.hardwareOptions = ['All', 'HW1', 'HW2'];
      component.filterService.selectedHardwares = ['HW1'];

      expect(component.filterService.selectedHardwares.length).toBeLessThan(component.filterService.hardwareOptions.length);
      expect(component.filterService.selectedHardwares.length).toBeGreaterThan(0);
    });
  });

  describe('ngAfterViewInit', () => {
    afterEach(() => {
      (window as any).webai = undefined;
    });
    
    it('should check for extension installation', fakeAsync(() => {
      spyOn(component, 'loadInitialHardwareInfo');
      
      (window as any).webai = undefined;
      
      component.ngAfterViewInit();
      expect(component.isExtensionInstalled).toBeFalse();

      // Simulate extension loading
      setTimeout(() => {
        (window as any).webai = { getHardwareInformation: () => Promise.resolve({}) };
      }, 100);

      tick(150);
      expect(component.isExtensionInstalled).toBeTrue();
      expect(component.loadInitialHardwareInfo).toHaveBeenCalled();
    }));
  });
});
