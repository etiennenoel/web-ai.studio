import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverviewComponent } from './overview.component';
import { AiModelDataService } from '../../services/ai-model-data.service';
import { NO_ERRORS_SCHEMA, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ModelManager, WriterManager, RewriterManager, PromptManager, ProofreaderManager, SummarizerManager, TranslatorManager, LanguageDetectorManager } from 'base';
import { Subject } from 'rxjs';

class MockManager {
  modelDownloadedEvent = new Subject<any>();
  createSession = jasmine.createSpy('createSession');
  create = jasmine.createSpy('create');
}

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    
    const mockAiModelData = {
      getModels: jasmine.createSpy('getModels').and.returnValue(Promise.resolve([])),
      getSystemStatus: jasmine.createSpy('getSystemStatus').and.returnValue(Promise.resolve({ vramUsage: '1GB' })),
      getStorageStats: jasmine.createSpy('getStorageStats').and.returnValue(Promise.resolve({ totalSize: '1GB', modelsSize: '1GB', languagePacksSize: '0GB' })),
      getApiAvailability: jasmine.createSpy('getApiAvailability').and.returnValue(Promise.resolve([])),
      getRecentActivity: jasmine.createSpy('getRecentActivity').and.returnValue(Promise.resolve([]))
    };

    await TestBed.configureTestingModule({
      declarations: [OverviewComponent],
      providers: [
        { provide: AiModelDataService, useValue: mockAiModelData },
        { provide: Router, useValue: routerSpy },
        { provide: ModelManager, useClass: MockManager },
        { provide: WriterManager, useClass: MockManager },
        { provide: RewriterManager, useClass: MockManager },
        { provide: PromptManager, useClass: MockManager },
        { provide: ProofreaderManager, useClass: MockManager },
        { provide: SummarizerManager, useClass: MockManager },
        { provide: TranslatorManager, useClass: MockManager },
        { provide: LanguageDetectorManager, useClass: MockManager }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to tab', () => {
    component.navigateToTab('prompt');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/', 'prompt']);
  });

  it('should toggle playground', () => {
    expect(component.isPlaygroundCollapsed).toBeFalse();
    component.togglePlayground();
    expect(component.isPlaygroundCollapsed).toBeTrue();
  });

  it('should run quick prompt successfully', async () => {
    component.quickPrompt = 'Hi';
    
    (window as any).LanguageModel = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        prompt: jasmine.createSpy('prompt').and.returnValue(Promise.resolve('Hello there!'))
      }))
    };

    await component.handleQuickPrompt();
    
    expect(component.chatHistory.length).toBe(2);
    expect(component.chatHistory[1].text).toBe('Hello there!');
  });
});
