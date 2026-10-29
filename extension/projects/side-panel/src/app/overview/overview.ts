import { Component, OnInit, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ApiDiagnostic, DiagnosisService } from 'base';

declare const chrome: any;

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
  private tabActivatedListener: (() => void) | null = null;
  private tabUpdatedListener: ((tabId: number, changeInfo: any) => void) | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private diagnosisService: DiagnosisService,
  ) {
    this.errorCount$ = this.diagnosisService.errorCount$;
  }

  /**
   * True only when the current website has actually invoked at least one Built-in AI API.
   */
  get apiDetected(): boolean {
    return this.usedApis.length > 0;
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

    this.refreshActiveTabContext();

    // Listen for updates from the background script or content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      this.runtimeMessageListener = (request: any, sender: any) => {
        if (request?.action === 'api_call_logged' || request?.action === 'log_api_call') {
          if (!sender?.tab?.id || sender.tab.id === this.activeTabId) {
            this.ngZone.run(() => {
              this.fetchActiveSessionsForTab();
            });
          }
        }
      };
      chrome.runtime.onMessage.addListener(this.runtimeMessageListener);
    }

    // Listen for tab changes
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (chrome.tabs.onActivated) {
        this.tabActivatedListener = () => {
          this.ngZone.run(() => this.refreshActiveTabContext());
        };
        chrome.tabs.onActivated.addListener(this.tabActivatedListener);
      }
      if (chrome.tabs.onUpdated) {
        this.tabUpdatedListener = (tabId: number, changeInfo: any) => {
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

  isBrowserApiUsedBySite(globalName: string): boolean {
    return this.usedApis.some((u) => u.apiName === globalName);
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

  refreshActiveTabContext(): void {
    this.loading = true;
    this.confirmingClear = false;
    this.checkWrapApiSetting();

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            const isWebOrigin = url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
            this.currentOrigin = isWebOrigin ? (url.origin !== 'null' ? url.origin : url.protocol + '//') : null;
            this.activeTabId = isWebOrigin ? tabs[0].id : null;

            // Trigger browser/window exposure check for the active tab
            this.diagnosisService.runChecks();

            if (this.activeTabId) {
              this.fetchActiveSessionsForTab();
            } else {
              this.resetUsageState();
            }
          } catch {
            this.currentOrigin = null;
            this.activeTabId = null;
            this.resetUsageState();
          }
        } else {
          this.currentOrigin = null;
          this.activeTabId = null;
          this.resetUsageState();
        }
      });
    } else {
      this.currentOrigin = null;
      this.activeTabId = null;
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

  fetchActiveSessionsForTab(): void {
    if (!this.activeTabId) return;

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.sendMessage) {
      chrome.tabs.sendMessage(this.activeTabId, { action: 'get_page_sessions' }, (response: any) => {
        if (chrome.runtime?.lastError || !response || !response.data) {
          this.ngZone.run(() => {
            this.resetUsageState();
          });
          return;
        }

        this.ngZone.run(() => {
          this.processHistory(response.data);
        });
      });
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
        methodsMap: Map<string, { method: string; count: number; hasError: boolean; earliestTimestamp: number }>;
      }
    >();

    const sessionsMap: { [sessionId: string]: any[] } = {};

    for (const item of items) {
      const apiName = item.api || 'Unknown API';
      const methodName = item.method || 'unknown';
      const ts = typeof item.timestamp === 'number' ? item.timestamp : 0;
      const hasError = Boolean(item.errorMessage || item.timestamps?.error !== undefined);

      if (!apiUsageMap.has(apiName)) {
        apiUsageMap.set(apiName, {
          apiName,
          totalCalls: 0,
          latestTimestamp: ts,
          methodsMap: new Map(),
        });
      }
      const apiEntry = apiUsageMap.get(apiName)!;
      apiEntry.totalCalls++;
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
            const priorityDiff = this.getMethodOrderPriority(a.method) - this.getMethodOrderPriority(b.method);
            if (priorityDiff !== 0) return priorityDiff;
            return a.earliestTimestamp - b.earliestTimestamp;
          })
          .map(({ method, count, hasError }) => ({ method, count, hasError }));

        return {
          apiName: entry.apiName,
          totalCalls: entry.totalCalls,
          methods,
          latestTimestamp: entry.latestTimestamp,
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

      // Order calls within a session chronologically (create before instance calls)
      calls.sort((a, b) => {
        const pDiff = this.getMethodOrderPriority(a.method) - this.getMethodOrderPriority(b.method);
        if (a.timestamp === b.timestamp && pDiff !== 0) return pDiff;
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      const latestTimestamp = calls.reduce((max, c) => Math.max(max, c.timestamp || 0), 0);
      const apiName = calls[calls.length - 1]?.api || 'Unknown API';
      const isStaticCall =
        calls.length === 1 && (calls[0].method === 'availability' || calls[0].method === 'params');

      return {
        sessionId: sid,
        apiName,
        calls,
        latestTimestamp,
        isStaticCall,
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
