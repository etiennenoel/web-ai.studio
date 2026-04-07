import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatorComponent } from './translator.component';
import { TranslatorDataService } from '../../services/translator-data.service';
import { ToastService, TranslatorManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA, NgZone } from '@angular/core';

describe('TranslatorComponent', () => {
  let component: TranslatorComponent;
  let fixture: ComponentFixture<TranslatorComponent>;

  beforeEach(async () => {
    const mockDataService = { getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])), addHistoryItem: jasmine.createSpy('addHistoryItem').and.returnValue(Promise.resolve()) };
    const mockToastService = { show: jasmine.createSpy('show') };
    const mockManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getAvailability: jasmine.createSpy('getAvailability').and.returnValue(Promise.resolve(ApiStatus.AVAILABLE)),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code'),
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        translate: jasmine.createSpy('translate').and.returnValue(Promise.resolve('Traduction')),
        destroy: jasmine.createSpy('destroy')
      }))
    };

    await TestBed.configureTestingModule({
      declarations: [TranslatorComponent],
      providers: [
        { provide: TranslatorDataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: TranslatorManager, useValue: mockManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TranslatorComponent);
    component = fixture.componentInstance;
    
    // Mock window API since translate component directly uses window.Translator
    (window as any).Translator = mockManager;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should run translate successfully', async () => {
    component.inputText = 'Hello';
    await component.translate();
    
    expect(component.translationResult).toBe('Traduction');
    expect(component.isTranslating).toBeFalse();
  });
});
