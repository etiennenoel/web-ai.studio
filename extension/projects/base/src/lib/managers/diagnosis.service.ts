import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const chrome: any;

export interface ApiDiagnostic {
  name: string;
  globalName: string;
  statusType: 'ga' | 'origin-trial' | 'dev-trial';
  devToolsStatus: boolean | 'checking';
  siteStatus: boolean | 'checking';
  flagName?: string;
  docsUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosisService {
  private apisData: ApiDiagnostic[] = [
    {
      name: 'Summarizer API',
      globalName: 'Summarizer',
      statusType: 'ga',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Prompt API',
      globalName: 'LanguageModel',
      statusType: 'origin-trial',
      flagName: 'prompt-api-for-gemini-nano',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Translator API',
      globalName: 'Translator',
      statusType: 'dev-trial',
      flagName: 'translation-api',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Language Detector API',
      globalName: 'LanguageDetector',
      statusType: 'dev-trial',
      flagName: 'language-detection-api',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Writer API',
      globalName: 'Writer',
      statusType: 'dev-trial',
      flagName: 'writer-api-for-gemini-nano',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Rewriter API',
      globalName: 'Rewriter',
      statusType: 'dev-trial',
      flagName: 'rewriter-api-for-gemini-nano',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Proofreader API',
      globalName: 'Proofreader',
      statusType: 'dev-trial',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    }
  ];

  public apis$ = new BehaviorSubject<ApiDiagnostic[]>(this.apisData);
  public isChecking$ = new BehaviorSubject<boolean>(true);
  public errorCount$ = new BehaviorSubject<number>(0);
  public errorHistory$ = new BehaviorSubject<any[]>([]);

  constructor(private ngZone: NgZone) {
    this.runChecks();
  }

  runChecks() {
    this.isChecking$.next(true);
    this.fetchErrorHistory();

    
    const currentApis = this.apis$.getValue();

    // 1. Check in DevTools Context
    currentApis.forEach(api => {
      api.devToolsStatus = typeof (self as any)[api.globalName] !== 'undefined';
    });
    this.apis$.next(currentApis);

    // 2. Check in Inspected Page Context
    if (typeof chrome !== 'undefined' && chrome.devtools) {
      const expression = `
        (function() {
          return {
            Summarizer: typeof Summarizer !== 'undefined',
            LanguageModel: typeof LanguageModel !== 'undefined',
            Translator: typeof Translator !== 'undefined',
            LanguageDetector: typeof LanguageDetector !== 'undefined',
            Writer: typeof Writer !== 'undefined',
            Rewriter: typeof Rewriter !== 'undefined',
            Proofreader: typeof Proofreader !== 'undefined'
          };
        })()
      `;
      chrome.devtools.inspectedWindow.eval(expression, (result: any, isException: any) => {
        this.ngZone.run(() => {
          let errorCount = 0;
          if (isException || !result) {
            currentApis.forEach(api => {
              api.siteStatus = false;
              errorCount++;
            });
          } else {
            currentApis.forEach(api => {
              api.siteStatus = result[api.globalName] === true;
              if (!api.siteStatus) errorCount++;
            });
          }
          this.apis$.next([...currentApis]);
          this.errorCount$.next(errorCount);
          this.isChecking$.next(false);
        });
      });
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      // Not in DevTools environment, likely in Side Panel. Send message to active tab content script
      try {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs: any) => {
          if (chrome.runtime.lastError) {
            console.error('DiagnosisService: tabs.query error', chrome.runtime.lastError);
            this.ngZone.run(() => {
              let errorCount = 0;
              currentApis.forEach(api => {
                api.siteStatus = false;
                errorCount++;
              });
              this.apis$.next([...currentApis]);
              this.errorCount$.next(errorCount);
              this.isChecking$.next(false);
            });
            return;
          }
          
          if (tabs && tabs.length > 0 && tabs[0].id) {
            let hasResponded = false;
            
            const timeoutId = setTimeout(() => {
              if (!hasResponded) {
                hasResponded = true;
                this.ngZone.run(() => {
                  let errorCount = 0;
                  currentApis.forEach(api => {
                    api.siteStatus = false;
                    errorCount++;
                  });
                  this.apis$.next([...currentApis]);
                  this.errorCount$.next(errorCount);
                  this.isChecking$.next(false);
                });
              }
            }, 2000);

            chrome.tabs.sendMessage(tabs[0].id, { action: 'diagnose_apis' }, (response: any) => {
              if (chrome.runtime.lastError) {
                console.warn('DiagnosisService: sendMessage error', chrome.runtime.lastError);
                // Continue to process as a failure
              }
              if (hasResponded) return;
              hasResponded = true;
              clearTimeout(timeoutId);

              this.ngZone.run(() => {
                let errorCount = 0;
                if (!response || !response.data) {
                  currentApis.forEach(api => {
                    api.siteStatus = false;
                    errorCount++;
                  });
                } else {
                  const result = response.data;
                  currentApis.forEach(api => {
                    api.siteStatus = result[api.globalName] === true;
                    if (!api.siteStatus) errorCount++;
                  });
                }
                this.apis$.next([...currentApis]);
                this.errorCount$.next(errorCount);
                this.isChecking$.next(false);
              });
            });
          } else {
            this.ngZone.run(() => {
              let errorCount = 0;
              currentApis.forEach(api => {
                api.siteStatus = false;
                errorCount++;
              });
              this.apis$.next([...currentApis]);
              this.errorCount$.next(errorCount);
              this.isChecking$.next(false);
            });
          }
        });
      } catch (err) {
        console.error('DiagnosisService: Error during tabs.query', err);
        this.ngZone.run(() => {
          let errorCount = 0;
          currentApis.forEach(api => {
            api.siteStatus = false;
            errorCount++;
          });
          this.apis$.next([...currentApis]);
          this.errorCount$.next(errorCount);
          this.isChecking$.next(false);
        });
      }
    } else {
      // Fallback
      let errorCount = 0;
      currentApis.forEach(api => {
        api.siteStatus = false;
        errorCount++;
      });
      this.apis$.next([...currentApis]);
      this.errorCount$.next(errorCount);
      this.isChecking$.next(false);
    }
  }

  fetchErrorHistory() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      if (chrome.devtools) {
        chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
          if (!isException && origin) {
            chrome.runtime.sendMessage({ action: 'get_api_history', payload: { origin, apiName: 'all' } }, (response: any) => {
              this.ngZone.run(() => {
                if (response && response.data) {
                  const errors = response.data.filter((item: any) => item.errorMessage || (item.response && item.response.error));
                  this.errorHistory$.next(errors);
                } else {
                  this.errorHistory$.next([]);
                }
              });
            });
          } else {
            this.errorHistory$.next([]);
          }
        });
      } else {
        // Side panel
        chrome.runtime.sendMessage({ action: 'get_all_history' }, (response: any) => {
          this.ngZone.run(() => {
            if (response && response.data) {
              const errors = response.data.filter((item: any) => item.errorMessage || (item.response && item.response.error));
              this.errorHistory$.next(errors);
            } else {
              this.errorHistory$.next([]);
            }
          });
        });
      }
    }
  }
}
