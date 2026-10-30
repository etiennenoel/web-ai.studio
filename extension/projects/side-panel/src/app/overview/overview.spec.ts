import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverviewComponent } from './overview';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DiagnosisService } from 'base';
import { BehaviorSubject } from 'rxjs';

class MockDiagnosisService {
  apis$ = new BehaviorSubject<any[]>([]);
  isChecking$ = new BehaviorSubject<boolean>(false);
  errorCount$ = new BehaviorSubject<number>(0);
  hasWebWorkers$ = new BehaviorSubject<boolean>(false);
  runChecks(_targetTabId?: number | null) {}
}

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let fixture: ComponentFixture<OverviewComponent>;
  let diagnosisService: MockDiagnosisService;
  let mockPageCalls: any[];
  let mockSwTabCalls: any[];
  let simulateLastError: { message: string } | null;
  let reloadedTabIds: number[];
  let sentRuntimeMessages: any[];
  let sentTabMessages: { tabId: number; message: any; options?: any }[];

  beforeEach(async () => {
    mockPageCalls = [];
    mockSwTabCalls = [];
    simulateLastError = null;
    reloadedTabIds = [];
    sentRuntimeMessages = [];
    sentTabMessages = [];

    (window as any).chrome = {
      runtime: {
        lastError: null,
        onMessage: { addListener: () => {}, removeListener: () => {} },
        sendMessage: (req: any, cb?: (res: any) => void) => {
          sentRuntimeMessages.push(req);
          if (req.action === 'get_setting' && req.key === 'wrap_api') {
            cb?.({ value: true });
          } else if (req.action === 'get_tab_sessions') {
            cb?.({ data: mockSwTabCalls });
          } else {
            cb?.({ success: true });
          }
        },
      },
      tabs: {
        onActivated: { addListener: () => {}, removeListener: () => {} },
        onUpdated: { addListener: () => {}, removeListener: () => {} },
        reload: (tabId: number) => {
          reloadedTabIds.push(tabId);
        },
        query: (_queryInfo: any, cb: (tabs: any[]) => void) => {
          cb([{ id: 42, url: 'https://example.com/shop' }]);
        },
        sendMessage: (tabId: number, message: any, optionsOrCb?: any, maybeCb?: (res: any) => void) => {
          const cb = typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb;
          const options = typeof optionsOrCb === 'function' ? undefined : optionsOrCb;
          sentTabMessages.push({ tabId, message, options });

          if (simulateLastError) {
            (window as any).chrome.runtime.lastError = simulateLastError;
            cb?.(undefined);
            (window as any).chrome.runtime.lastError = null;
            return;
          }

          if (message.action === 'get_page_sessions') {
            cb?.({ data: mockPageCalls, meta: { wrappingActive: true, hasWebWorkers: false } });
          } else if (message.action === 'clear_page_sessions') {
            mockPageCalls = [];
            mockSwTabCalls = [];
            cb?.({ success: true });
          }
        },
      },
    };

    await TestBed.configureTestingModule({
      declarations: [OverviewComponent],
      imports: [CommonModule],
      providers: [{ provide: DiagnosisService, useClass: MockDiagnosisService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    diagnosisService = TestBed.inject(DiagnosisService) as unknown as MockDiagnosisService;
    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should explicitly distinguish browser window exposure (including polyfill badge) from site usage when the site makes no calls', () => {
    diagnosisService.apis$.next([
      { globalName: 'LanguageModel', siteStatus: true },
      { globalName: 'DecisionModel', siteStatus: true, isPolyfilled: true },
      { globalName: 'Writer', siteStatus: false },
    ]);
    diagnosisService.isChecking$.next(false);
    fixture.detectChanges();

    expect(component.apiDetected).toBe(false);
    expect(component.usedApis.length).toBe(0);
    expect(component.exposedBrowserApis.length).toBe(2);
    expect(component.missingBrowserApis.length).toBe(1);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Used by This Site');
    expect(text).toContain('No AI APIs Called by This Site');
    expect(text).toContain('Exposed by Browser (window)');
    expect(text).toContain('2 of 3 Built-in AI globals available in this browser');
    expect(text).toContain('window.LanguageModel');
    expect(text).toContain('window.DecisionModel');
    expect(text).toContain('(polyfill)');
    expect(text).toContain('+1 not exposed');

    // Verify top-frame targeting `{ frameId: 0 }`
    const pageSessionsMsg = sentTabMessages.find((m) => m.message.action === 'get_page_sessions');
    expect(pageSessionsMsg?.options).toEqual({ frameId: 0 });
  });

  it('should show needs_reload state with Reload Tab button instead of falsely claiming 0 calls on uninstrumented tabs', () => {
    simulateLastError = { message: 'Could not establish connection. Receiving end does not exist.' };
    component.refreshActiveTabContext();
    fixture.detectChanges();

    expect(component.instrumentationStatus).toBe('needs_reload');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Reload Tab to Monitor AI Calls');
    expect(text).not.toContain('No AI APIs Called by This Site');

    component.reloadActiveTab();
    expect(reloadedTabIds).toEqual([42]);
  });

  it('should distinguish "Probed by This Site" when only static availability() was called vs "Called by This Site" when sessions are created', () => {
    mockPageCalls = [
      {
        id: 'probe-1',
        sessionId: 'probe-1',
        api: 'LanguageModel',
        method: 'availability',
        timestamp: 1000,
        timestamps: { execute: 1000, completed: 1002 },
        response: 'unavailable',
      },
    ];

    component.refreshActiveTabContext();
    fixture.detectChanges();

    expect(component.apiDetected).toBe(true);
    expect(component.isProbeOnlyUsage).toBe(true);
    expect(component.hasActiveSessionUsage).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('1 AI API Probed by This Site');
  });

  it('should aggregate top-frame and iframe calls and method call counts under "Used by This Site"', () => {
    diagnosisService.apis$.next([
      { globalName: 'LanguageModel', siteStatus: true },
      { globalName: 'Summarizer', siteStatus: true },
    ]);
    diagnosisService.isChecking$.next(false);

    mockPageCalls = [
      {
        id: 'c1',
        sessionId: 'c1',
        api: 'LanguageModel',
        method: 'availability',
        timestamp: 1000,
        timestamps: { execute: 1000, completed: 1002 },
        response: 'available',
      },
      {
        id: 's1',
        sessionId: 's1',
        api: 'LanguageModel',
        method: 'create',
        timestamp: 1010,
        timestamps: { create: 1010, completed: 1050 },
        options: { samplingMode: 'most-predictable' },
      },
      {
        id: 'c2',
        sessionId: 's1',
        api: 'LanguageModel',
        method: 'promptStreaming',
        timestamp: 1060,
        timestamps: { execute: 1060, first_token: 1080, completed: 1120 },
        args: ['Summarize item'],
        response: 'Great item',
      },
      {
        id: 'c3',
        sessionId: 's1',
        api: 'LanguageModel',
        method: 'promptStreaming',
        timestamp: 1150,
        timestamps: { execute: 1150, completed: 1200 },
        args: ['Follow-up'],
        response: 'More info',
      },
    ];

    // Simulated subframe (`<iframe>`) call aggregated by the service worker
    mockSwTabCalls = [
      {
        id: 's2',
        sessionId: 's2',
        api: 'Summarizer',
        method: 'availability',
        origin: 'https://widget.example.com',
        isSubframe: true,
        frameId: 3,
        timestamp: 1300,
        timestamps: { execute: 1300, completed: 1301 },
        response: 'downloadable',
      },
    ];

    component.refreshActiveTabContext();
    fixture.detectChanges();

    expect(component.apiDetected).toBe(true);
    expect(component.hasActiveSessionUsage).toBe(true);
    expect(component.totalCallsCount).toBe(5);
    expect(component.usedApis.length).toBe(2);
    expect(component.isBrowserApiUsedBySite('LanguageModel')).toBe(true);

    const summarizerUsage = component.usedApis.find((u) => u.apiName === 'Summarizer')!;
    expect(summarizerUsage.totalCalls).toBe(1);
    expect(summarizerUsage.probeOnly).toBe(true);
    expect(summarizerUsage.hasSubframeCalls).toBe(true);
    expect(summarizerUsage.methods).toEqual([{ method: 'availability', count: 1, hasError: false }]);

    const lmUsage = component.usedApis.find((u) => u.apiName === 'LanguageModel')!;
    expect(lmUsage.totalCalls).toBe(4);
    expect(lmUsage.probeOnly).toBe(false);
    expect(lmUsage.methods).toEqual([
      { method: 'availability', count: 1, hasError: false },
      { method: 'create', count: 1, hasError: false },
      { method: 'promptStreaming', count: 2, hasError: false },
    ]);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('2 AI APIs Called by This Site');
    expect(text).toContain('LanguageModel');
    expect(text).toContain('Summarizer');
    expect(text).toContain('iframe');
    expect(text).toContain('availability()');
    expect(text).toContain('create()');
    expect(text).toContain('promptStreaming()');

    // Filter by API when clicked
    component.toggleApiFilter('LanguageModel');
    expect(component.filteredSessions.every((s) => s.apiName === 'LanguageModel')).toBe(true);
    component.toggleApiFilter('LanguageModel');
    expect(component.selectedApiFilter).toBeNull();
  });

  it('should discard stale async responses from an earlier tab switch', () => {
    let tab42Callback: ((res: any) => void) | null = null;
    (window as any).chrome.tabs.sendMessage = (
      tabId: number,
      _message: any,
      _opts: any,
      cb: (res: any) => void,
    ) => {
      if (tabId === 42) {
        tab42Callback = cb;
      } else if (tabId === 99) {
        cb({ data: [] });
      }
    };

    component.activeTabId = 42;
    component.fetchActiveSessionsForTab();

    // User switches to tab 99 before tab 42 replies
    component.activeTabId = 99;
    component.fetchActiveSessionsForTab();

    // Late response from tab 42 arrives with calls - must be ignored
    tab42Callback!({
      data: [
        {
          id: 'stale-1',
          sessionId: 'stale-1',
          api: 'LanguageModel',
          method: 'create',
          timestamp: 1000,
          timestamps: { create: 1000, completed: 1010 },
        },
      ],
    });

    expect(component.usedApis.length).toBe(0);
  });

  it('should clear both persistent origin history and in-memory tab sessions when confirmed', () => {
    mockPageCalls = [
      {
        id: 'c1',
        sessionId: 'c1',
        api: 'LanguageModel',
        method: 'availability',
        timestamp: 1000,
        timestamps: { execute: 1000, completed: 1001 },
        response: 'available',
      },
    ];
    component.refreshActiveTabContext();
    fixture.detectChanges();
    expect(component.usedApis.length).toBe(1);

    component.promptClearHistory();
    expect(component.confirmingClear).toBe(true);

    component.confirmClearHistory();
    fixture.detectChanges();

    expect(component.confirmingClear).toBe(false);
    expect(component.usedApis.length).toBe(0);
    expect(component.sessions.length).toBe(0);
    expect(sentRuntimeMessages.some((m) => m.action === 'clear_api_history')).toBe(true);
    expect(sentTabMessages.some((m) => m.message.action === 'clear_page_sessions')).toBe(true);
  });
});
