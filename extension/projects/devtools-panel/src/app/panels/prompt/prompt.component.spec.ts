import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromptComponent } from './prompt.component';
import { PromptDataService } from '../../services/prompt-data.service';
import { PromptManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PromptComponent', () => {
  let component: PromptComponent;
  let fixture: ComponentFixture<PromptComponent>;

  beforeEach(async () => {
    const mockDataService = { 
      getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])),
      addHistoryItem: jasmine.createSpy('addHistoryItem').and.returnValue(Promise.resolve())
    };
    const mockManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code'),
      getParams: jasmine.createSpy('getParams').and.returnValue(Promise.resolve({ defaultTemperature: 1, maxTemperature: 2, defaultTopK: 3, maxTopK: 128 })),
      createSession: jasmine.createSpy('createSession').and.returnValue(Promise.resolve({
        promptStreaming: jasmine.createSpy('promptStreaming').and.returnValue((async function*() { yield 'Hello '; yield 'world'; })()),
        destroy: jasmine.createSpy('destroy')
      }))
    };

    await TestBed.configureTestingModule({
      declarations: [PromptComponent],
      providers: [
        { provide: PromptDataService, useValue: mockDataService },
        { provide: PromptManager, useValue: mockManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run prompt and accumulate stream chunks', async () => {
    component.promptText = 'Hello';
    await component.runPrompt();
    
    expect(component.response).toBe('Hello world');
    expect(component.isBusy).toBeFalse();
  });

  it('should reset settings', () => {
    component.temperature = 2;
    component.topK = 50;
    component.resetSettings();
    expect(component.temperature).toBe(1);
    expect(component.topK).toBe(3);
  });
});
