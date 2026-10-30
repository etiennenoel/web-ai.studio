import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';

declare const chrome: any;

const STATIC_PROBE_METHODS = new Set(['availability', 'params', 'capabilities']);
const REFRESH_DEBOUNCE_MS = 80;

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.html',
  styleUrls: [],
  standalone: false,
})
export class SessionsComponent implements OnInit, OnDestroy {
  sessionsByOrigin: { [origin: string]: any[] } = {};
  origins: string[] = [];
  loading = true;
  expandedCalls = new Set<string>();
  confirmingOrigin: string | null = null;

  private runtimeMessageListener: ((request: any) => void) | null = null;
  private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.fetchActiveSessions();

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      this.runtimeMessageListener = (request: any) => {
        const action = request?.action;
        if (
          action === 'api_call_logged' ||
          action === 'log_api_call' ||
          action === 'clear_api_history' ||
          action === 'clear_all_history'
        ) {
          this.scheduleRefresh();
        }
      };
      chrome.runtime.onMessage.addListener(this.runtimeMessageListener);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshDebounceTimer !== null) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = null;
    }
    if (
      typeof chrome !== 'undefined' &&
      this.runtimeMessageListener &&
      chrome.runtime?.onMessage?.removeListener
    ) {
      chrome.runtime.onMessage.removeListener(this.runtimeMessageListener);
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshDebounceTimer !== null) return;
    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshDebounceTimer = null;
      this.ngZone.run(() => {
        this.fetchActiveSessions();
      });
    }, REFRESH_DEBOUNCE_MS);
  }

  toggleDetails(callId: string): void {
    if (this.expandedCalls.has(callId)) {
      this.expandedCalls.delete(callId);
    } else {
      this.expandedCalls.add(callId);
    }
  }

  hasPayload(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return true;
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

  fetchActiveSessions(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_all_history' }, (response: any) => {
        if (response && response.data) {
          this.ngZone.run(() => {
            this.processHistory(response.data);
          });
        } else {
          this.ngZone.run(() => {
            this.processHistory([]);
          });
        }
      });
    } else {
      this.processHistory([]);
    }
  }

  processHistory(history: any[]): void {
    const grouped: { [origin: string]: any[] } = {};
    for (const item of history) {
      const origin = item.origin || 'Unknown Origin';
      if (!grouped[origin]) {
        grouped[origin] = [];
      }
      grouped[origin].push(item);
    }

    const sessionsByOrigin: { [origin: string]: any[] } = {};
    for (const origin of Object.keys(grouped)) {
      const items = grouped[origin];
      const sessionsMap: { [sessionId: string]: any[] } = {};
      for (const item of items) {
        const sid = item.sessionId || item.id;
        if (!sessionsMap[sid]) {
          sessionsMap[sid] = [];
        }
        sessionsMap[sid].push(item);
      }

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
        calls.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const latestTimestamp = calls.reduce((max, c) => Math.max(max, c.timestamp || 0), 0);
        const apiName = calls[calls.length - 1]?.api || 'Unknown API';
        const isStaticCall = calls.length === 1 && STATIC_PROBE_METHODS.has(calls[0].method);

        return {
          sessionId: sid,
          apiName,
          calls,
          latestTimestamp,
          isStaticCall,
        };
      });

      sessions.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

      if (sessions.length > 0) {
        sessionsByOrigin[origin] = sessions;
      }
    }

    this.sessionsByOrigin = sessionsByOrigin;
    this.origins = Object.keys(sessionsByOrigin).sort();
    this.loading = false;
    this.cdr.detectChanges();
  }

  promptClearHistory(origin: string): void {
    this.confirmingOrigin = origin;
  }

  cancelClearHistory(): void {
    this.confirmingOrigin = null;
  }

  confirmClearHistory(origin: string): void {
    this.confirmingOrigin = null;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'clear_api_history', payload: { origin } }, () => {
        this.ngZone.run(() => {
          this.fetchActiveSessions();
        });
      });
    }
  }
}
