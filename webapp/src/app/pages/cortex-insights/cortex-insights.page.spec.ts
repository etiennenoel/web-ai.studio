import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CortexInsightsPage } from './cortex-insights.page';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Title, Meta } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';

describe('CortexInsightsPage', () => {
  let component: CortexInsightsPage;
  let fixture: ComponentFixture<CortexInsightsPage>;
  let httpMock: HttpTestingController;
  let titleService: jasmine.SpyObj<Title>;
  let metaService: jasmine.SpyObj<Meta>;

  beforeEach(async () => {
    const titleSpy = jasmine.createSpyObj('Title', ['setTitle']);
    const metaSpy = jasmine.createSpyObj('Meta', ['updateTag']);

    await TestBed.configureTestingModule({
      declarations: [CortexInsightsPage],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: Title, useValue: titleSpy },
        { provide: Meta, useValue: metaSpy },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    titleService = TestBed.inject(Title) as jasmine.SpyObj<Title>;
    metaService = TestBed.inject(Meta) as jasmine.SpyObj<Meta>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CortexInsightsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(component).toBeTruthy();
    expect(titleService.setTitle).toHaveBeenCalledWith('Cortex Insights - Web AI Studio');
    expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Historical Performance Profiler for Web AI Studio' });

    // Expecting the index.json request
    const req = httpMock.expectOne('/data/baselines/index.json');
    req.flush([]);
  });

  it('should fetch baseline index and load data on init', fakeAsync(() => {
    fixture.detectChanges();

    const mockIndex = [
      { filename: 'mock1', name: 'Mock HW', executionType: 'CPU', model: 'Mock Model' }
    ];

    const reqIndex = httpMock.expectOne('/data/baselines/index.json');
    reqIndex.flush(mockIndex);

    const reqMock1 = httpMock.expectOne('/data/baselines/mock1.json');
    reqMock1.flush({
      results: {
        testsResults: [
          {
            api: 'translator',
            testIterationResults: [
              { status: 'Success', tokensPerSecond: 10, timeToFirstToken: 100, charactersPerSecond: 50, totalResponseTime: 500 }
            ]
          }
        ]
      }
    });

    tick(); // Wait for Promises to resolve

    expect(component.rawBaselines.length).toBe(1);
    expect(component.rawBaselines[0].filename).toBe('mock1');
    expect(component.rawBaselines[0].tests.length).toBe(1);
    expect(component.rawBaselines[0].tests[0].api).toBe('translator');
    expect(component.leaderboard.length).toBe(1);
  }));

  it('should correctly apply filters', fakeAsync(() => {
    fixture.detectChanges();
    
    const mockIndex = [
      { filename: 'mock1', name: 'HW 1', executionType: 'CPU', model: 'Model A' },
      { filename: 'mock2', name: 'HW 2', executionType: 'GPU', model: 'Model B' }
    ];

    httpMock.expectOne('/data/baselines/index.json').flush(mockIndex);
    
    httpMock.expectOne('/data/baselines/mock1.json').flush({
      results: {
        testsResults: [
          {
            api: 'api1',
            testIterationResults: [{ status: 'Success', tokensPerSecond: 10, timeToFirstToken: 100, charactersPerSecond: 50, totalResponseTime: 500 }]
          }
        ]
      }
    });
    
    httpMock.expectOne('/data/baselines/mock2.json').flush({
      results: {
        testsResults: [
          {
            api: 'api2',
            testIterationResults: [{ status: 'Success', tokensPerSecond: 20, timeToFirstToken: 200, charactersPerSecond: 100, totalResponseTime: 1000 }]
          }
        ]
      }
    });

    tick();
    
    expect(component.rawBaselines.length).toBe(2);
    expect(component.leaderboard.length).toBe(2);

    // Filter by HW 1
    component.selectedHardwares = ['HW 1'];
    component.applyFilters();
    expect(component.leaderboard.length).toBe(1);
    expect(component.leaderboard[0].hw).toBe('HW 1');

    // Reset and Filter by api2
    component.selectedHardwares = ['HW 1', 'HW 2'];
    component.selectedApis = ['api2'];
    component.applyFilters();
    expect(component.leaderboard.length).toBe(1);
    expect(component.leaderboard[0].apis).toEqual(['api2']);
    
    // Search query
    component.selectedApis = ['api1', 'api2'];
    component.searchQuery = 'hw 2';
    component.applyFilters();
    expect(component.leaderboard.length).toBe(1);
    expect(component.leaderboard[0].hw).toBe('HW 2');
  }));

  it('should correctly sort the leaderboard', fakeAsync(() => {
    fixture.detectChanges();
    
    const mockIndex = [
      { filename: 'mock1', name: 'HW 1', executionType: 'CPU', model: 'Model A' },
      { filename: 'mock2', name: 'HW 2', executionType: 'GPU', model: 'Model B' }
    ];

    httpMock.expectOne('/data/baselines/index.json').flush(mockIndex);
    
    httpMock.expectOne('/data/baselines/mock1.json').flush({
      results: {
        testsResults: [
          { api: 'api1', testIterationResults: [{ status: 'Success', tokensPerSecond: 10 }] }
        ]
      }
    });
    
    httpMock.expectOne('/data/baselines/mock2.json').flush({
      results: {
        testsResults: [
          { api: 'api1', testIterationResults: [{ status: 'Success', tokensPerSecond: 20 }] }
        ]
      }
    });

    tick();
    
    expect(component.leaderboard.length).toBe(2);
    
    // Default sort is speed desc
    expect(component.tableSortColumn).toBe('speed');
    expect(component.tableSortDirection).toBe('desc');
    expect(component.leaderboard[0].speed).toBe(20);
    expect(component.leaderboard[1].speed).toBe(10);
    expect(component.leaderboard[0].trend).toBe('best');
    expect(component.leaderboard[1].trend).toBe('worst');

    // Change sort to speed asc
    component.setTableSort('speed');
    expect(component.tableSortDirection).toBe('asc');
    expect(component.leaderboard[0].speed).toBe(10);
    expect(component.leaderboard[1].speed).toBe(20);

    // Change sort to hw asc
    component.setTableSort('hw');
    expect(component.tableSortColumn).toBe('hw');
    expect(component.tableSortDirection).toBe('asc');
    expect(component.leaderboard[0].hw).toBe('HW 1');
    expect(component.leaderboard[1].hw).toBe('HW 2');
  }));

  it('should calculate fleet metrics correctly', fakeAsync(() => {
    fixture.detectChanges();
    
    const mockIndex = [
      { filename: 'mock1', name: 'HW 1', executionType: 'CPU', model: 'Model A' },
      { filename: 'mock2', name: 'HW 2', executionType: 'GPU', model: 'Model B' }
    ];

    httpMock.expectOne('/data/baselines/index.json').flush(mockIndex);
    
    httpMock.expectOne('/data/baselines/mock1.json').flush({
      results: {
        testsResults: [
          { api: 'api1', testIterationResults: [{ status: 'Success', tokensPerSecond: 10, timeToFirstToken: 100, charactersPerSecond: 50, totalResponseTime: 500 }] }
        ]
      }
    });
    
    httpMock.expectOne('/data/baselines/mock2.json').flush({
      results: {
        testsResults: [
          { api: 'api1', testIterationResults: [{ status: 'Success', tokensPerSecond: 30, timeToFirstToken: 300, charactersPerSecond: 150, totalResponseTime: 1500 }] }
        ]
      }
    });

    tick();
    
    expect(component.fleetAvgSpeed).toBe(20); // (10 + 30) / 2
    expect(component.fleetAvgCharSpeed).toBe(100); // (50 + 150) / 2
    expect(component.fleetAvgTtft).toBe(200); // (100 + 300) / 2

    expect(component.topSpeed).toBe(30); // Max speed because sorted by speed desc, mock2 is first
    expect(component.topCharSpeed).toBe(150);

    expect(component.maxSpeed).toBe(30);
    expect(component.minSpeed).toBe(10);
    expect(component.maxTtft).toBe(300);
    expect(component.minTtft).toBe(100);
    expect(component.maxTotal).toBe(1500);
    expect(component.minTotal).toBe(500);
  }));
});
