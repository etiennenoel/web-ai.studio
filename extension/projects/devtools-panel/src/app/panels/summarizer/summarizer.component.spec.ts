import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummarizerComponent } from './summarizer.component';
import { SummarizerDataService } from '../../services/summarizer-data.service';
import { ToastService, SummarizerManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA, NgZone } from '@angular/core';

describe('SummarizerComponent', () => {
  let component: SummarizerComponent;
  let fixture: ComponentFixture<SummarizerComponent>;

  beforeEach(async () => {
    const mockDataService = { getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])), addHistoryItem: jasmine.createSpy('addHistoryItem').and.returnValue(Promise.resolve()) };
    const mockToastService = { show: jasmine.createSpy('show') };
    const mockManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code')
    };

    await TestBed.configureTestingModule({
      declarations: [SummarizerComponent],
      providers: [
        { provide: SummarizerDataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: SummarizerManager, useValue: mockManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SummarizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run summarize successfully', async () => {
    component.inputText = 'Hello';
    
    (window as any).Summarizer = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        summarizeStreaming: jasmine.createSpy('summarizeStreaming').and.returnValue((async function*() { yield 'Summary'; })()),
        destroy: jasmine.createSpy('destroy')
      }))
    };

    await component.summarize();
    
    expect(component.summaryResult).toBe('Summary');
    expect(component.isSummarizing).toBeFalse();
  });
});
