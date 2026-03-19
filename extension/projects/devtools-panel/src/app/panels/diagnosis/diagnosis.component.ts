import { Component, ChangeDetectorRef, NgZone } from '@angular/core';

declare const chrome: any;

interface ApiInfo {
  name: string;
  globalName: string;
  status: string;
  statusDescription: string;
  devToolsStatus: boolean | 'checking';
  siteStatus: boolean | 'checking';
  docsUrl?: string;
}

@Component({
  selector: 'app-diagnosis',
  templateUrl: './diagnosis.component.html',
  styleUrls: ['./diagnosis.component.scss'],
  standalone: false
})
export class DiagnosisComponent {
  apis: ApiInfo[] = [
    {
      name: 'Summarizer API',
      globalName: 'Summarizer',
      status: 'General Availability (or close to it)',
      statusDescription: 'Should generally be available without special flags if Chrome is updated.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Prompt API',
      globalName: 'LanguageModel',
      status: 'Origin Trial',
      statusDescription: 'An Origin Trial allows developers to try new features on their sites for a limited time. Users visiting the site will have the API enabled if the site provides a valid Origin Trial token. For local testing, you might need Chrome flags.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Translator API',
      globalName: 'Translator',
      status: 'Dev Trial',
      statusDescription: 'A Dev Trial means the feature is available for local testing but requires manual activation via chrome://flags.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Language Detector API',
      globalName: 'LanguageDetector',
      status: 'Dev Trial',
      statusDescription: 'A Dev Trial means the feature is available for local testing but requires manual activation via chrome://flags.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Writer API',
      globalName: 'Writer',
      status: 'Dev Trial',
      statusDescription: 'A Dev Trial means the feature is available for local testing but requires manual activation via chrome://flags.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Rewriter API',
      globalName: 'Rewriter',
      status: 'Dev Trial',
      statusDescription: 'A Dev Trial means the feature is available for local testing but requires manual activation via chrome://flags.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    },
    {
      name: 'Proofreader API',
      globalName: 'Proofreader',
      status: 'Dev Trial',
      statusDescription: 'A Dev Trial means the feature is available for local testing but requires manual activation via chrome://flags.',
      devToolsStatus: 'checking',
      siteStatus: 'checking',
      docsUrl: 'https://developer.chrome.com/docs/ai/built-in-apis'
    }
  ];

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {
    this.runChecks();
  }

  runChecks() {
    // 1. Check in DevTools Context
    this.apis.forEach(api => {
      api.devToolsStatus = typeof (self as any)[api.globalName] !== 'undefined';
    });

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
          if (isException || !result) {
            this.apis.forEach(api => api.siteStatus = false);
          } else {
            this.apis.forEach(api => {
              api.siteStatus = result[api.globalName] === true;
            });
          }
          this.cdr.detectChanges();
        });
      });
    } else {
      // Not in DevTools environment
      this.apis.forEach(api => api.siteStatus = false);
    }
  }
}
