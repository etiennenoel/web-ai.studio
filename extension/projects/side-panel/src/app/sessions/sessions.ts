import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';

declare const chrome: any;

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.html',
  styleUrls: [],
  standalone: false,
})
export class SessionsComponent implements OnInit {
  sessionsByOrigin: { [origin: string]: any[] } = {};
  origins: string[] = [];
  loading = true;
  expandedCalls = new Set<string>();
  confirmingOrigin: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.fetchActiveSessions();

    // Listen for updates from the background script or content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request: any) => {
        if (request?.action === 'api_call_logged' || request?.action === 'log_api_call') {
          this.ngZone.run(() => {
            setTimeout(() => this.fetchActiveSessions(), 100);
          });
        }
      });
    }
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
    // Group by origin
    const grouped: { [origin: string]: any[] } = {};
    for (const item of history) {
      const origin = item.origin || 'Unknown Origin';
      if (!grouped[origin]) {
        grouped[origin] = [];
      }
      grouped[origin].push(item);
    }

    // Now, group by session ID per origin
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

      // sort sessions by latest timestamp
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
