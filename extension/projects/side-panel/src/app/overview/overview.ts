import { Component, OnInit, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ApiDiagnostic, DiagnosisService } from 'base';

declare const chrome: any;

const STATIC_PROBE_METHODS = new Set(['availability', 'params', 'capabilities']);
const REFRESH_DEBOUNCE_MS = 80;

export type TabInstrumentationStatus = 'active' | 'needs_reload' | 'unsupported';

export interface UsedApiMethodSummary {
  method: string;
  count: number;
  hasError: boolean;
}

export interface UsedApiSummary {
  apiName: string;
  totalCalls: number;
  methods: UsedApiMethodSummary[];
  latestTimestamp: number;
  probeOnly: boolean;
  hasSubframeCalls: boolean;
}

@Component({
  selector: 'app-overview',
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
  standalone: false,
})
export class OverviewComponent implements OnInit, OnDestroy {
  currentOrigin: string | null = null;
  activeTabId: number | null = null;
  instrumentationStatus: TabInstrumentationStatus = 'active';
  pageHasWebWorkers = false;

  sessions: any[] = [];
  usedApis: UsedApiSummary[] = [];
  totalCallsCount = 0;
  selectedApiFilter: string | null = null;
  loading = true;
  wrapApiEnabled = true;
  confirmingClear = false;

  // Browser / window exposure state (distinct from whether the site calls the APIs)
  browserApis: ApiDiagnostic[] = [];
  exposedBrowserApis: ApiDiagnostic[] = [];
  missingBrowserApis: ApiDiagnostic[] = [];
  isCheckingBrowserApis = true;

  expandedCalls = new Set<string>();
  showDevtoolsInfo = true;
  errorCount$: Observable<number>;

  private subscriptions: Subscription[] = [];
  private runtimeMessageListener: ((request: any, sender: any) => void) | null = null;
  private tabActivatedListener: ((activeInfo: any) => void) | null = null;
  private tabUpdatedListener: ((tabId: number, changeInfo: any, tab?: any) => void) | null = null;
  private currentWindowId: number | null = null;
  private contextSeq = 0;
  private fetchSeq = 0;
  private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private diagnosisService: DiagnosisService,
  ) {
    this.errorCount$ = this.diagnosisService.errorCount$;
  }

  /**
   * True when the current website (or one of its subframes) invoked at least one Built-in AI API method.
   */
  get apiDetected(): boolean {
    return this.usedApis.length > 0;
  }

  /**
   * True when at least one Built-in AI API had `.create()` or an instance method invoked.
   */
  get hasActiveSessionUsage(): boolean {
    return this.usedApis.some((u) => !u.probeOnly);
  }

  /**
   * True when the site only probed static methods (`availability()`, `params()`, `capabilities()`)
   * without creating any AI sessions yet.
   */
  get isProbeOnlyUsage(): boolean {
    return this.usedApis.length > 0 && this.usedApis.every((u) => u.probeOnly);
  }

  get filteredSessions(): any[] {
    if (!this.selectedApiFilter) {
      return this.sessions;
    }
    return this.sessions.filter((session) => session.apiName === this.selectedApiFilter);
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.diagnosisService.apis$.subscribe((apis: ApiDiagnostic[]) => {
        const list = Array.isArray(apis) ? apis : [];
        this.browserApis = list;
        this.exposedBrowserApis = list.filter((api) => api.siteStatus === true);
        this.missingBrowserApis = list.filter((api) => api.siteStatus === false);
        this.cdr.detectChanges();
      }),
    );

    if (this.diagnosisService.isChecking$) {
      this.subscriptions.push(
        this.diagnosisService.isChecking$.subscribe((checking: boolean) => {
          this.isCheckingBrowserApis = checking;
          this.cdr.detectChanges();
        }),
      );
    } else {
      this.isCheckingBrowserApis = false;
    }

    if (this.diagnosisService.hasWebWorkers$) {
      this.subscriptions.push(
        this.diagnosisService.hasWebWorkers$.subscribe((hasWorkers: boolean) => {
          this.pageHasWebWorkers = hasWorkers;
          this.cdr.detectChanges();
        }),
      );
    }

    if (typeof chrome !== 'undefined' && chrome.windows?.getCurrent) {
      try {
        chrome.windows.getCurrent((win: any) => {
          if (!chrome.runtime?.lastError && typeof win?.id === 'number') {
            this.currentWindowId = win.id;
          }
          this.ngZone.run(() => this.refreshActiveTabContext());
        });
      } catch {
        this.refreshActiveTabContext();
      }
    } else {
      this.refreshActiveTabContext();
    }

    // Listen for updates from the background script or content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      this.runtimeMessageListener = (request: any, sender: any) => {
        const action = request?.action;
        if (action === 'api_call_logged' || action === 'log_api_call') {
          if (!sender?.tab?.id || sender.tab.id === this.activeTabId) {
            this.scheduleSessionsRefresh();
          }
        } else if (action === 'settings_updated') {
          this.ngZone.run(() => this.refreshActiveTabContext());
        } else if (action === 'clear_api_history' || action === 'clear_all_history') {
          this.ngZone.run(() => this.fetchActiveSessionsForTab());
        }
      };
      chrome.runtime.onMessage.addListener(this.runtimeMessageListener);
    }

    // Listen for tab changes scoped to this Side Panel's browser window
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (chrome.tabs.onActivated) {
        this.tabActivatedListener = (activeInfo: any) => {
          if (
            this.currentWindowId !== null &&
            activeInfo?.windowId !== undefined &&
            activeInfo.windowId !== this.currentWindowId
          ) {
            return;
          }
          this.ngZone.run(() => this.refreshActiveTabContext());
        };
        chrome.tabs.onActivated.addListener(this.tabActivatedListener);
      }

      if (chrome.tabs.onUpdated) {
        this.tabUpdatedListener = (tabId: number, changeInfo: any, tab?: any) => {
          if (
            this.currentWindowId !== null &&
            tab?.windowId !== undefined &&
            tab.windowId !== this.currentWindowId
          ) {
            return;
          }

          if (this.activeTabId && tabId === this.activeTabId && changeInfo.status === 'loading') {
            this.ngZone.run(() => {
              this.loading = true;
              this.sessions = [];
              this.usedApis = [];
              this.totalCallsCount = 0;
              this.selectedApiFilter = null;
              this.confirmingClear = false;
              this.cdr.detectChanges();
            });
            return;
          }

          if (
            (!this.activeTabId || tabId === this.activeTabId) &&
            (changeInfo.status === 'complete' || changeInfo.url)
          ) {
            this.ngZone.run(() => this.refreshActiveTabContext());
          }
        };
        chrome.tabs.onUpdated.addListener(this.tabUpdatedListener);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.refreshDebounceTimer !== null) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = null;
    }
    this.subscriptions.forEach((s) => s.unsubscribe());
    if (typeof chrome !== 'undefined') {
      if (this.runtimeMessageListener && chrome.runtime?.onMessage?.removeListener) {
        chrome.runtime.onMessage.removeListener(this.runtimeMessageListener);
      }
      if (this.tabActivatedListener && chrome.tabs?.onActivated?.removeListener) {
        chrome.tabs.onActivated.removeListener(this.tabActivatedListener);
      }
      if (this.tabUpdatedListener && chrome.tabs?.onUpdated?.removeListener) {
        chrome.tabs.onUpdated.removeListener(this.tabUpdatedListener);
      }
    }
  }

  private scheduleSessionsRefresh(): void {
    if (this.refreshDebounceTimer !== null) return;
    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshDebounceTimer = null;
      this.ngZone.run(() => {
        this.fetchActiveSessionsForTab();
      });
    }, REFRESH_DEBOUNCE_MS);
  }

  isBrowserApiUsedBySite(globalName: string): boolean {
    return this.usedApis.some((u) => u.apiName === globalName);
  }

  reloadActiveTab(): void {
    if (this.activeTabId && typeof chrome !== 'undefined' && chrome.tabs?.reload) {
      this.loading = true;
      this.cdr.detectChanges();
      chrome.tabs.reload(this.activeTabId);
    }
  }

  toggleDetails(callId: string): void {
    if (this.expandedCalls.has(callId)) {
      this.expandedCalls.delete(callId);
    } else {
      this.expandedCalls.add(callId);
    }
  }

  toggleApiFilter(apiName: string): void {
    this.selectedApiFilter = this.selectedApiFilter === apiName ? null : apiName;
  }

  clearApiFilter(): void {
    this.selectedApiFilter = null;
  }

  hasPayload(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return true;
  }

  getInlineResponsePreview(call: any): string | null {
    if (call?.method === 'availability' && typeof call.response === 'string') {
      return call.response;
    }
    return null;
  }

  private isRestrictedWebStoreUrl(url: URL): boolean {
    return (
      url.hostname === 'chromewebstore.google.com' ||
      (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))
    );
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

  refreshActiveTabContext(): void {
    const seq = ++this.contextSeq;
    this.loading = true;
    this.confirmingClear = false;
    this.pageHasWebWorkers = false;
    this.checkWrapApiSetting();

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const queryInfo =
        this.currentWindowId !== null
          ? { active: true, windowId: this.currentWindowId }
          : { active: true, currentWindow: true };

      chrome.tabs.query(queryInfo, (tabs: any) => {
        if (seq !== this.contextSeq) return;

        if (tabs && tabs.length > 0 && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            const isWebOrigin =
              url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
            const isRestricted = isWebOrigin && this.isRestrictedWebStoreUrl(url);

            if (isWebOrigin && !isRestricted && typeof tabs[0].id === 'number') {
              this.currentOrigin =
                url.origin !== 'null' ? url.origin : `${url.protocol}//`;
              this.activeTabId = tabs[0].id;
              this.instrumentationStatus = 'active';

              this.diagnosisService.runChecks(this.activeTabId ?? undefined);
              this.fetchActiveSessionsForTab();
            } else {
              this.currentOrigin = isRestricted ? url.origin : null;
              this.activeTabId = null;
              this.instrumentationStatus = 'unsupported';
              this.diagnosisService.runChecks(null);
              this.resetUsageState();
            }
          } catch {
            this.currentOrigin = null;
            this.activeTabId = null;
            this.instrumentationStatus = 'unsupported';
            this.diagnosisService.runChecks(null);
            this.resetUsageState();
          }
        } else {
          this.currentOrigin = null;
          this.activeTabId = null;
          this.instrumentationStatus = 'unsupported';
          this.diagnosisService.runChecks(null);
          this.resetUsageState();
        }
      });
    } else {
      this.currentOrigin = null;
      this.activeTabId = null;
      this.instrumentationStatus = 'unsupported';
      this.resetUsageState();
    }
  }

  private checkWrapApiSetting(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { action: 'get_setting', key: 'wrap_api', defaultValue: true },
        (response: any) => {
          this.ngZone.run(() => {
            if (!chrome.runtime?.lastError) {
              this.wrapApiEnabled = response?.value !== false;
              this.cdr.detectChanges();
            }
          });
        },
      );
    }
  }

  private resetUsageState(): void {
    this.sessions = [];
    this.usedApis = [];
    this.totalCallsCount = 0;
    this.selectedApiFilter = null;
    this.loading = false;
    this.cdr.detectChanges();
  }

  private mergeCallRecords(topFrameCalls: any[], swTabCalls: any[]): any[] {
    const merged = new Map<string, any>();

    for (const call of topFrameCalls) {
      if (call && typeof call.id === 'string') {
        merged.set(call.id, call);
      }
    }

    for (const call of swTabCalls) {
      if (!call || typeof call.id !== 'string') continue;
      const existing = merged.get(call.id);
      if (!existing) {
        merged.set(call.id, call);
      } else {
        const existingTsCount = existing.timestamps ? Object.keys(existing.timestamps).length : 0;
        const incomingTsCount = call.timestamps ? Object.keys(call.timestamps).length : 0;
        if (incomingTsCount > existingTsCount) {
          merged.set(call.id, { ...existing, ...call });
        } else if (call.isSubframe) {
          existing.isSubframe = true;
        }
      }
    }

    return Array.from(merged.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  fetchActiveSessionsForTab(): void {
    if (!this.activeTabId) return;

    const seq = ++this.fetchSeq;
    const requestedTabId = this.activeTabId;

    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      return;
    }

    const hasRuntimeMessaging = Boolean(chrome.runtime?.sendMessage);
    let pending = hasRuntimeMessaging ? 2 : 1;
    let topFrameFailed = false;
    let topFrameCalls: any[] = [];
    let swTabCalls: any[] = [];
    let topFrameMeta: any = null;

    const finalize = () => {
      pending--;
      if (pending > 0) return;
      if (seq !== this.fetchSeq || requestedTabId !== this.activeTabId) return;

      this.ngZone.run(() => {
        if (seq !== this.fetchSeq || requestedTabId !== this.activeTabId) return;

        if (topFrameFailed) {
          this.instrumentationStatus = 'needs_reload';
          this.resetUsageState();
          return;
        }

        this.instrumentationStatus = 'active';
        if (topFrameMeta) {
          if (typeof topFrameMeta.hasWebWorkers === 'boolean' && topFrameMeta.hasWebWorkers) {
            this.pageHasWebWorkers = true;
          }
          if (typeof topFrameMeta.wrappingActive === 'boolean') {
            this.wrapApiEnabled = topFrameMeta.wrappingActive;
          }
        }

        const mergedCalls = this.mergeCallRecords(topFrameCalls, swTabCalls);
        this.processHistory(mergedCalls);
      });
    };

    this.sendMessageToTopFrame(
      requestedTabId,
      { action: 'get_page_sessions', includeMeta: true },
      (response: any) => {
        if (chrome.runtime?.lastError || !response || !Array.isArray(response.data)) {
          topFrameFailed = true;
        } else {
          topFrameCalls = response.data;
          topFrameMeta = response.meta ?? null;
        }
        finalize();
      },
    );

    if (hasRuntimeMessaging) {
      try {
        chrome.runtime.sendMessage(
          { action: 'get_tab_sessions', tabId: requestedTabId },
          (response: any) => {
            if (!chrome.runtime?.lastError && Array.isArray(response?.data)) {
              swTabCalls = response.data;
            }
            finalize();
          },
        );
      } catch {
        finalize();
      }
    }
  }

  private resolveStage(call: any): string {
    if (call?.timestamps?.error !== undefined || call?.errorMessage) {
      return 'error';
    }
    if (call?.timestamps?.completed !== undefined) {
      return 'completed';
    }
    if (call?.timestamps?.first_token !== undefined) {
      return 'first_token';
    }
    if (call?.timestamps?.execute !== undefined) {
      return 'execute';
    }
    if (call?.timestamps?.create !== undefined) {
      return 'create';
    }
    return call?.stage || 'pending';
  }

  private getMethodOrderPriority(method: string): number {
    switch (method) {
      case 'availability':
        return 0;
      case 'params':
      case 'capabilities':
        return 1;
      case 'create':
        return 2;
      default:
        return 3;
    }
  }

  processHistory(history: any[]): void {
    const items = Array.isArray(history) ? history : [];

    // 1. Aggregate per-API usage and per-method call counts
    const apiUsageMap = new Map<
      string,
      {
        apiName: string;
        totalCalls: number;
        latestTimestamp: number;
        hasNonProbeCall: boolean;
        hasSubframeCalls: boolean;
        methodsMap: Map<
          string,
          { method: string; count: number; hasError: boolean; earliestTimestamp: number }
        >;
      }
    >();

    const sessionsMap: { [sessionId: string]: any[] } = {};

    for (const item of items) {
      const apiName = item.api || 'Unknown API';
      const methodName = item.method || 'unknown';
      const ts = typeof item.timestamp === 'number' ? item.timestamp : 0;
      const hasError = Boolean(item.errorMessage || item.timestamps?.error !== undefined);
      const isStaticProbe = STATIC_PROBE_METHODS.has(methodName);

      if (!apiUsageMap.has(apiName)) {
        apiUsageMap.set(apiName, {
          apiName,
          totalCalls: 0,
          latestTimestamp: ts,
          hasNonProbeCall: false,
          hasSubframeCalls: false,
          methodsMap: new Map(),
        });
      }
      const apiEntry = apiUsageMap.get(apiName)!;
      apiEntry.totalCalls++;
      if (!isStaticProbe) {
        apiEntry.hasNonProbeCall = true;
      }
      if (item.isSubframe) {
        apiEntry.hasSubframeCalls = true;
      }
      if (ts > apiEntry.latestTimestamp) {
        apiEntry.latestTimestamp = ts;
      }

      if (!apiEntry.methodsMap.has(methodName)) {
        apiEntry.methodsMap.set(methodName, {
          method: methodName,
          count: 0,
          hasError: false,
          earliestTimestamp: ts,
        });
      }
      const methodEntry = apiEntry.methodsMap.get(methodName)!;
      methodEntry.count++;
      methodEntry.hasError = methodEntry.hasError || hasError;
      if (ts < methodEntry.earliestTimestamp) {
        methodEntry.earliestTimestamp = ts;
      }

      const sid = item.sessionId || item.id;
      if (!sessionsMap[sid]) {
        sessionsMap[sid] = [];
      }
      sessionsMap[sid].push(item);
    }

    const usedApis: UsedApiSummary[] = Array.from(apiUsageMap.values())
      .map((entry) => {
        const methods = Array.from(entry.methodsMap.values())
          .sort((a, b) => {
            const priorityDiff =
              this.getMethodOrderPriority(a.method) - this.getMethodOrderPriority(b.method);
            if (priorityDiff !== 0) return priorityDiff;
            return a.earliestTimestamp - b.earliestTimestamp;
          })
          .map(({ method, count, hasError }) => ({ method, count, hasError }));

        return {
          apiName: entry.apiName,
          totalCalls: entry.totalCalls,
          methods,
          latestTimestamp: entry.latestTimestamp,
          probeOnly: !entry.hasNonProbeCall,
          hasSubframeCalls: entry.hasSubframeCalls,
        };
      })
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

    // 2. Build session groups for detailed call list
    const sessions = Object.keys(sessionsMap).map((sid) => {
      const calls = sessionsMap[sid].map((call) => {
        let durationMs: number | null = null;
        if (call.timestamps) {
          const start = call.timestamps.execute ?? call.timestamps.create;
          const end = call.timestamps.completed ?? call.timestamps.error;
          if (start !== undefined && end !== undefined) {
            durationMs = Math.max(0, Math.round(end - start));
          }
        }
        return {
          ...call,
          stage: this.resolveStage(call),
          durationMs,
        };
      });

      calls.sort((a, b) => {
        const pDiff = this.getMethodOrderPriority(a.method) - this.getMethodOrderPriority(b.method);
        if (a.timestamp === b.timestamp && pDiff !== 0) return pDiff;
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      const latestTimestamp = calls.reduce((max, c) => Math.max(max, c.timestamp || 0), 0);
      const apiName = calls[calls.length - 1]?.api || 'Unknown API';
      const isStaticCall = calls.length === 1 && STATIC_PROBE_METHODS.has(calls[0].method);
      const isSubframe = calls.some((c) => Boolean(c.isSubframe));
      const frameOrigin = isSubframe ? calls[0]?.origin || null : null;

      return {
        sessionId: sid,
        apiName,
        calls,
        latestTimestamp,
        isStaticCall,
        isSubframe,
        frameOrigin,
      };
    });

    sessions.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

    this.usedApis = usedApis;
    this.totalCallsCount = items.length;
    if (this.selectedApiFilter && !this.usedApis.some((u) => u.apiName === this.selectedApiFilter)) {
      this.selectedApiFilter = null;
    }
    this.sessions = sessions;
    this.loading = false;
    this.cdr.detectChanges();
  }

  promptClearHistory(): void {
    this.confirmingClear = true;
  }

  cancelClearHistory(): void {
    this.confirmingClear = false;
  }

  confirmClearHistory(): void {
    this.confirmingClear = false;
    if (!this.currentOrigin) return;

    const clearTabMemory = () => {
      if (this.activeTabId && typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
        chrome.tabs.sendMessage(this.activeTabId, { action: 'clear_page_sessions' }, () => {
          if (chrome.runtime?.lastError) {
            // Ignore if tab cannot receive message
          }
          this.ngZone.run(() => {
            this.resetUsageState();
          });
        });
      } else {
        this.ngZone.run(() => {
          this.resetUsageState();
        });
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { action: 'clear_api_history', payload: { origin: this.currentOrigin } },
        () => {
          clearTabMemory();
        },
      );
    } else {
      clearTabMemory();
    }
  }

  dismissDevtoolsInfo(): void {
    this.showDevtoolsInfo = false;
  }
}
