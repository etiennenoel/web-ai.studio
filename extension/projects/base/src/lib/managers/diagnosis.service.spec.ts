import { TestBed } from '@angular/core/testing';
import { DiagnosisService } from './diagnosis.service';
import { NgZone } from '@angular/core';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('DiagnosisService', () => {
  let service: DiagnosisService;
  let ngZone: NgZone;

  beforeEach(() => {
    // Mock global chrome
    (window as any).chrome = {
      devtools: {
        inspectedWindow: {
          eval: vi.fn()
        }
      }
    };
    
    // Mock self object used for DevTools Context check
    Object.defineProperty(window, 'Summarizer', { value: undefined, writable: true });
    Object.defineProperty(window, 'LanguageModel', { value: {}, writable: true });

    TestBed.configureTestingModule({
      providers: [
        DiagnosisService,
        { provide: NgZone, useValue: { run: (fn: any) => fn() } }
      ]
    });
    service = TestBed.inject(DiagnosisService);
    ngZone = TestBed.inject(NgZone);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check DevTools Context on runChecks', () => {
    service.runChecks();
    
    // According to our mock, Summarizer is undefined, LanguageModel is defined
    const apis = service.apis$.getValue();
    const summarizer = apis.find(a => a.globalName === 'Summarizer');
    const languageModel = apis.find(a => a.globalName === 'LanguageModel');
    
    expect(summarizer?.devToolsStatus).toBe(false);
    expect(languageModel?.devToolsStatus).toBe(true);
  });

  it('should check Inspected Page Context and update error count on success', () => {
    return new Promise<void>((done) => {
      const evalSpy = (window as any).chrome.devtools.inspectedWindow.eval;
      
      // Setup the mock eval to succeed with some APIs missing
      evalSpy.mockImplementation((expr: string, callback: Function) => {
        callback({
          Summarizer: true,
          LanguageModel: false, // Emulating missing API
          Translator: true,
          LanguageDetector: true,
          Writer: true,
          Rewriter: true,
          Proofreader: true
        }, null);
      });

      service.errorCount$.subscribe(count => {
        if (count === 1) { // We expect exactly 1 error (LanguageModel)
          const apis = service.apis$.getValue();
          const summarizer = apis.find(a => a.globalName === 'Summarizer');
          const languageModel = apis.find(a => a.globalName === 'LanguageModel');
          
          expect(summarizer?.siteStatus).toBe(true);
          expect(languageModel?.siteStatus).toBe(false);
          done();
        }
      });

      service.runChecks();
    });
  });

  it('should handle exception during Inspected Page Context eval', () => {
    return new Promise<void>((done) => {
      const evalSpy = (window as any).chrome.devtools.inspectedWindow.eval;
      
      // Setup the mock eval to fail with an exception
      evalSpy.mockImplementation((expr: string, callback: Function) => {
        callback(null, { isError: true, description: 'Internal error' });
      });

      service.errorCount$.subscribe(count => {
        // 7 APIs total, if all fail, count should be 7
        if (count === 7) { 
          const apis = service.apis$.getValue();
          const allFailed = apis.every(a => a.siteStatus === false);
          expect(allFailed).toBe(true);
          done();
        }
      });

      service.runChecks();
    });
  });

  it('should handle missing chrome devtools environment', () => {
    // Remove the devtools mock
    delete (window as any).chrome.devtools;
    
    service.runChecks();
    
    expect(service.errorCount$.getValue()).toBe(7); // All fail
    const apis = service.apis$.getValue();
    expect(apis.every(a => a.siteStatus === false)).toBe(true);
  });
});
