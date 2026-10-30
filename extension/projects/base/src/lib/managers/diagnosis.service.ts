import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const chrome: any;

export interface ApiDiagnostic {
  name: string;
  globalName: string;
  statusType: 'ga' | 'origin-trial' | 'dev-trial';
  devToolsStatus: boolean | 'checking';
  siteStatus: boolean | 'checking';
  isPolyfilled?: boolean;
  flagName?: string;
  docsUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class DiagnosisService {
  private readonly templateApis: ReadonlyArray<ApiDiagnostic> = [
    {
      name: 'Summarizer API',
      globalName: 'Summarizer',
      statusType: 'ga',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Prompt API',
      globalName: 'LanguageModel',
      statusType: 'origin-trial',
      flagName: 'prompt-api-for-gemini-nano',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Translator API',
      globalName: 'Translator',
      statusType: 'dev-trial',
      flagName: 'translation-api',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Language Detector API',
      globalName: 'LanguageDetector',
      statusType: 'dev-trial',
      flagName: 'language-detection-api',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Writer API',
      globalName: 'Writer',
      statusType: 'dev-trial',
      flagName: 'writer-api-for-gemini-nano',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Rewriter API',
      globalName: 'Rewriter',
      statusType: 'dev-trial',
      flagName: 'rewriter-api-for-gemini-nano',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Proofreader API',
      globalName: 'Proofreader',
      statusType: 'dev-trial',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis',
    },
    {
      name: 'Decisions API (polyfill)',
      globalName: 'DecisionModel',
      statusType: 'dev-trial',
      flagName: 'decisions-api',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://web-ai.studio/docs/decisions',
    },
  ];

  public apis$ = new BehaviorSubject<ApiDiagnostic[]>(this.cloneTemplateApis());
  public isChecking$ = new BehaviorSubject<boolean>(true);
  public errorCount$ = new BehaviorSubject<number>(0);
  public errorHistory$ = new BehaviorSubject<any[]>([]);
  public pageReachable$ = new BehaviorSubject<boolean>(true);
  public hasWebWorkers$ = new BehaviorSubject<boolean>(false);
  public polyfilledApis$ = new BehaviorSubject<string[]>([]);

  private checkSeq = 0;

  constructor(private ngZone: NgZone) {
    this.runChecks();
  }

  private cloneTemplateApis(): ApiDiagnostic[] {
    return this.templateApis.map((api) => ({ ...api }));
  }

  private sendMessageToTopFrame(
    tabId: number,
    message: unknown,
    callback: (response: any) => void,
  ): void {
    if (chrome.tabs.sendMessage.length === 3) {
      chrome.tabs.sendMessage(tabId, message, callback);
    } else {
      chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, callback);
    }
  }

  runChecks(targetTabId?: number | null): void {
    const seq = ++this.checkSeq;
    this.isChecking$.next(true);
    this.fetchErrorHistory();

    const currentApis = this.cloneTemplateApis();

    // 1. Check in Extension / DevTools Context
    currentApis.forEach((api) => {
      api.devToolsStatus = typeof (self as any)[api.globalName] !== 'undefined';
    });
    this.apis$.next(currentApis.map((api) => ({ ...api })));

    // Explicit non-web tab (e.g. chrome://, New Tab) passed from Side Panel
    if (targetTabId === null) {
      this.ngZone.run(() => {
        if (seq !== this.checkSeq) return;
        currentApis.forEach((api) => {
          api.siteStatus = false;
        });
        this.pageReachable$.next(false);
        this.hasWebWorkers$.next(false);
        this.polyfilledApis$.next([]);
        this.apis$.next(currentApis);
        this.errorCount$.next(0);
        this.isChecking$.next(false);
      });
      return;
    }

    // 2. Check in Inspected Page Context (DevTools)
    if (typeof chrome !== 'undefined' && chrome.devtools && chrome.devtools.inspectedWindow) {
      const expression = `
        (function() {
          return {
            Summarizer: typeof Summarizer !== 'undefined',
            LanguageModel: typeof LanguageModel !== 'undefined',
            Translator: typeof Translator !== 'undefined',
            LanguageDetector: typeof LanguageDetector !== 'undefined',
            Writer: typeof Writer !== 'undefined',
            Rewriter: typeof Rewriter !== 'undefined',
            Proofreader: typeof Proofreader !== 'undefined',
            DecisionModel: typeof DecisionModel !== 'undefined',
            __polyfilledApis: (typeof window !== 'undefined' && window.webai && window.webai.decisions && window.webai.decisions.isPolyfilled) ? ['DecisionModel'] : []
          };
        })()
      `;
      let hasResponded = false;
      const timeoutId = setTimeout(() => {
        if (hasResponded || seq !== this.checkSeq) return;
        hasResponded = true;
        this.ngZone.run(() => {
          if (seq !== this.checkSeq) return;
          let errorCount = 0;
          currentApis.forEach((api) => {
            api.siteStatus = false;
            errorCount++;
          });
          this.pageReachable$.next(false);
          this.apis$.next(currentApis);
          this.errorCount$.next(errorCount);
          this.isChecking$.next(false);
        });
      }, 2000);

      try {
        chrome.devtools.inspectedWindow.eval(expression, (result: any, isException: any) => {
          if (hasResponded || seq !== this.checkSeq) return;
          hasResponded = true;
          clearTimeout(timeoutId);
          this.ngZone.run(() => {
            if (seq !== this.checkSeq) return;
            let errorCount = 0;
            if (isException || !result) {
              this.pageReachable$.next(false);
              currentApis.forEach((api) => {
                api.siteStatus = false;
                errorCount++;
              });
            } else {
              this.pageReachable$.next(true);
              const polyfilled: string[] = Array.isArray(result.__polyfilledApis)
                ? result.__polyfilledApis
                : [];
              this.polyfilledApis$.next(polyfilled);
              currentApis.forEach((api) => {
                api.siteStatus = result[api.globalName] === true;
                api.isPolyfilled = polyfilled.includes(api.globalName);
                if (!api.siteStatus) errorCount++;
              });
            }
            this.apis$.next(currentApis);
            this.errorCount$.next(errorCount);
            this.isChecking$.next(false);
          });
        });
      } catch {
        if (!hasResponded && seq === this.checkSeq) {
          hasResponded = true;
          clearTimeout(timeoutId);
          this.ngZone.run(() => {
            if (seq !== this.checkSeq) return;
            let errorCount = 0;
            currentApis.forEach((api) => {
              api.siteStatus = false;
              errorCount++;
            });
            this.pageReachable$.next(false);
            this.apis$.next(currentApis);
            this.errorCount$.next(errorCount);
            this.isChecking$.next(false);
          });
        }
      }
      return;
    }

    // 3. Side Panel / Extension Tab Context
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const inspectTabId = (tabId: number) => {
        let hasResponded = false;

        const timeoutId = setTimeout(() => {
          if (hasResponded || seq !== this.checkSeq) return;
          hasResponded = true;
          this.ngZone.run(() => {
            if (seq !== this.checkSeq) return;
            currentApis.forEach((api) => {
              api.siteStatus = false;
            });
            this.pageReachable$.next(false);
            this.apis$.next(currentApis);
            this.errorCount$.next(0);
            this.isChecking$.next(false);
          });
        }, 2000);

        this.sendMessageToTopFrame(tabId, { action: 'diagnose_apis' }, (response: any) => {
          const hadLastError = Boolean(chrome.runtime?.lastError);
          if (hasResponded || seq !== this.checkSeq) return;
          hasResponded = true;
          clearTimeout(timeoutId);

          this.ngZone.run(() => {
            if (seq !== this.checkSeq) return;
            if (hadLastError || !response || !response.data) {
              currentApis.forEach((api) => {
                api.siteStatus = false;
              });
              this.pageReachable$.next(false);
              this.hasWebWorkers$.next(false);
              this.polyfilledApis$.next([]);
              this.apis$.next(currentApis);
              this.errorCount$.next(0);
              this.isChecking$.next(false);
              return;
            }

            this.pageReachable$.next(true);
            const result = response.data;
            const polyfilled: string[] = Array.isArray(response.meta?.polyfilledApis)
              ? response.meta.polyfilledApis
              : [];
            this.polyfilledApis$.next(polyfilled);
            this.hasWebWorkers$.next(Boolean(response.meta?.hasWebWorkers));

            let errorCount = 0;
            currentApis.forEach((api) => {
              api.siteStatus = result[api.globalName] === true;
              api.isPolyfilled = polyfilled.includes(api.globalName);
              if (api.globalName === 'DecisionModel') {
                api.name = api.isPolyfilled ? 'Decisions API (polyfill)' : 'Decisions API';
              }
              if (!api.siteStatus) errorCount++;
            });

            this.apis$.next(currentApis);
            this.errorCount$.next(errorCount);
            this.isChecking$.next(false);
          });
        });
      };

      if (typeof targetTabId === 'number') {
        inspectTabId(targetTabId);
        return;
      }

      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
          if (seq !== this.checkSeq) return;
          if (chrome.runtime?.lastError) {
            this.ngZone.run(() => {
              if (seq !== this.checkSeq) return;
              currentApis.forEach((api) => {
                api.siteStatus = false;
              });
              this.pageReachable$.next(false);
              this.apis$.next(currentApis);
              this.errorCount$.next(0);
              this.isChecking$.next(false);
            });
            return;
          }

          if (tabs && tabs.length > 0 && typeof tabs[0].id === 'number') {
            inspectTabId(tabs[0].id);
          } else {
            this.ngZone.run(() => {
              if (seq !== this.checkSeq) return;
              currentApis.forEach((api) => {
                api.siteStatus = false;
              });
              this.pageReachable$.next(false);
              this.apis$.next(currentApis);
              this.errorCount$.next(0);
              this.isChecking$.next(false);
            });
          }
        });
      } catch {
        this.ngZone.run(() => {
          if (seq !== this.checkSeq) return;
          currentApis.forEach((api) => {
            api.siteStatus = false;
          });
          this.pageReachable$.next(false);
          this.apis$.next(currentApis);
          this.errorCount$.next(0);
          this.isChecking$.next(false);
        });
      }
      return;
    }

    // 4. Fallback when neither DevTools nor chrome.tabs is available
    let errorCount = 0;
    currentApis.forEach((api) => {
      api.siteStatus = false;
      errorCount++;
    });
    this.pageReachable$.next(false);
    this.apis$.next(currentApis);
    this.errorCount$.next(errorCount);
    this.isChecking$.next(false);
  }

  fetchErrorHistory(): void {
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
