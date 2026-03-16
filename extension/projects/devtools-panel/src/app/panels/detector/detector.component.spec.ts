import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetectorComponent } from './detector.component';
import { DetectorDataService } from '../../services/detector-data.service';
import { ToastService, LanguageDetectorManager, ApiStatus, FEATURE_FLAGS } from 'base';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DetectorComponent', () => {
  let component: DetectorComponent;
  let fixture: ComponentFixture<DetectorComponent>;

  beforeEach(async () => {
    const mockDataService = { getHistory: jasmine.createSpy('getHistory').and.returnValue(Promise.resolve([])) };
    const mockToastService = { show: jasmine.createSpy('show') };
    const mockDetectorManager = {
      getStatus: jasmine.createSpy('getStatus').and.returnValue(Promise.resolve({ status: ApiStatus.AVAILABLE, message: 'Ready', checks: [] })),
      getCodeSnippet: jasmine.createSpy('getCodeSnippet').and.returnValue('// code')
    };

    await TestBed.configureTestingModule({
      declarations: [DetectorComponent],
      providers: [
        { provide: DetectorDataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LanguageDetectorManager, useValue: mockDetectorManager },
        { provide: FEATURE_FLAGS, useValue: { showHistory: true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check api status on init', async () => {
    await fixture.whenStable();
    expect(component.isApiAvailable).toBe(true);
    expect(component.statusText).toBe('Ready');
  });

  it('should toggle code viewer', () => {
    expect(component.isCodeViewerVisible).toBeFalse();
    component.toggleCodeViewer();
    expect(component.isCodeViewerVisible).toBeTrue();
  });

  it('should detect language successfully', async () => {
    component.inputText = 'Bonjour';
    
    // Mock window.LanguageDetector
    (window as any).LanguageDetector = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        detect: jasmine.createSpy('detect').and.returnValue(Promise.resolve([{ detectedLanguage: 'fr', confidence: 0.99 }]))
      }))
    };

    await component.detect();
    
    expect(component.detectionResult.length).toBe(1);
    expect(component.detectionResult[0].detectedLanguage).toBe('fr');
    expect(component.errorMsg).toBe('');
  });

  it('should handle detection error', async () => {
    component.inputText = 'Bonjour';
    
    // Mock window.LanguageDetector
    (window as any).LanguageDetector = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        detect: jasmine.createSpy('detect').and.returnValue(Promise.reject(new Error('Test error')))
      }))
    };

    await component.detect();
    
    expect(component.detectionResult.length).toBe(0);
    expect(component.errorMsg).toBe('Error: Test error');
  });
});
