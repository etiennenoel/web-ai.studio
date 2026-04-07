import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProofreaderComponent } from './proofreader.component';
import { ProofreaderDataService } from '../../services/proofreader-data.service';
import { ToastService, ProofreaderManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ProofreaderComponent', () => {
  let component: ProofreaderComponent;
  let fixture: ComponentFixture<ProofreaderComponent>;

  beforeEach(async () => {
    const mockDataService = { getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])), addHistoryItem: jasmine.createSpy('addHistoryItem').and.returnValue(Promise.resolve()) };
    const mockToastService = { show: jasmine.createSpy('show') };
    const mockManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code'),
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        proofread: jasmine.createSpy('proofread').and.returnValue(Promise.resolve({ correctedInput: 'Corrected' })),
        destroy: jasmine.createSpy('destroy')
      }))
    };

    await TestBed.configureTestingModule({
      declarations: [ProofreaderComponent],
      providers: [
        { provide: ProofreaderDataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ProofreaderManager, useValue: mockManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ProofreaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run proofread successfully', async () => {
    component.inputText = 'Hello';
    await component.proofread();
    
    expect(component.proofreaderOutput).toBe('Corrected');
    expect(component.isProofreading).toBeFalse();
  });
});
