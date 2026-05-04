import { Component, OnInit, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { DiagnosisService } from 'base';

declare const chrome: any;
declare const window: any;

@Component({
  selector: 'app-overview',
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
  standalone: false
})
export class OverviewComponent implements OnInit, OnDestroy {
  currentOrigin: string | null = null;
  activeTabId: number | null = null;
  sessions: any[] = [];
  loading = true;
  apiDetected = false;

  expandedCalls = new Set<string>();
  showDevtoolsInfo = true;
  errorCount$: Observable<number>;
  private subscriptions: Subscription[] = [];

  constructor(
    private cdr: ChangeDetectorRef, 
    private ngZone: NgZone,
    private diagnosisService: DiagnosisService
  ) {
    this.errorCount$ = this.diagnosisService.errorCount$;
  }

  ngOnInit(): void {
    this.refreshActiveTabContext();
    
    this.subscriptions.push(
      this.diagnosisService.apis$.subscribe((apis: any[]) => {
        // Assume API detected if any API has siteStatus === true
        this.apiDetected = apis.some((api: any) => api.siteStatus === true);
        this.cdr.detectChanges();
      })
    );

    // Listen for updates from the background script or content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'api_call_logged' || request.action === 'log_api_call') {
          this.ngZone.run(() => {
            // Re-fetch from the current page session
            this.fetchActiveSessionsForTab();
          });
        }
      });
    }

    // Listen for tab changes
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => {
        this.ngZone.run(() => this.refreshActiveTabContext());
      });
      chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any) => {
        if (changeInfo.status === 'complete' || changeInfo.url) {
          this.ngZone.run(() => this.refreshActiveTabContext());
        }
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  toggleDetails(callId: string) {
    if (this.expandedCalls.has(callId)) {
      this.expandedCalls.delete(callId);
    } else {
      this.expandedCalls.add(callId);
    }
  }

  refreshActiveTabContext() {
    this.loading = true;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            this.currentOrigin = url.origin;
            this.activeTabId = tabs[0].id;
            
            // Trigger diagnosis refresh for the new tab
            this.diagnosisService.runChecks();
            
            // Fetch calls from the content script
            this.fetchActiveSessionsForTab();
          } catch (e) {
            this.currentOrigin = null;
            this.activeTabId = null;
            this.sessions = [];
            this.loading = false;
            this.cdr.detectChanges();
          }
        } else {
          this.currentOrigin = null;
          this.activeTabId = null;
          this.sessions = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.currentOrigin = null;
      this.activeTabId = null;
      this.sessions = [];
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  fetchActiveSessionsForTab() {
    if (!this.activeTabId) return;

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.sendMessage) {
      chrome.tabs.sendMessage(this.activeTabId, { action: 'get_page_sessions' }, (response: any) => {
        // Handle potential error (e.g. content script not ready or restricted page)
        if (chrome.runtime.lastError || !response || !response.data) {
          this.ngZone.run(() => {
            this.sessions = [];
            this.loading = false;
            this.cdr.detectChanges();
          });
          return;
        }

        this.ngZone.run(() => {
          this.processHistory(response.data);
        });
      });
    }
  }

  processHistory(history: any[]) {
    // History is already filtered by origin because it comes from the tab's content script
    const items = history;

    const sessionsMap: { [sessionId: string]: any[] } = {};
    for (const item of items) {
      const sid = item.sessionId || item.id;
      if (!sessionsMap[sid]) {
        sessionsMap[sid] = [];
      }
      sessionsMap[sid].push(item);
    }
    
    const sessions = Object.keys(sessionsMap).map(sid => {
      const calls = sessionsMap[sid].map(call => {
        let durationMs = null;
        if (call.timestamps) {
          const start = call.timestamps.execute || call.timestamps.create;
          const end = call.timestamps.completed || call.timestamps.error;
          if (start && end) {
            durationMs = end - start;
          }
        }
        return { ...call, durationMs };
      });
      calls.sort((a, b) => b.timestamp - a.timestamp);
      const latestCall = calls[0];
      const apiName = latestCall.api || 'Unknown API';
      
      return {
        sessionId: sid,
        apiName: apiName,
        calls: calls,
        latestTimestamp: latestCall.timestamp
      };
    });
    
    sessions.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    
    this.sessions = sessions;
    this.loading = false;
    this.cdr.detectChanges();
  }

  clearHistory() {
    // Note: Since this is ephemeral memory in the content script, 
    // we don't necessarily need a 'clear' button for the active session 
    // unless we want to clear the content script's memory too.
    // For now, let's keep it consistent with the user's wish that it's 
    // strictly for the current navigating session.
    if (this.currentOrigin && window.confirm(`Are you sure you want to clear all history for ${this.currentOrigin}?`)) {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'clear_api_history', payload: { origin: this.currentOrigin } }, (response: any) => {
          this.ngZone.run(() => {
            // Also re-fetch current tab (it will still be empty if clear_api_history also clears the SW memory, 
            // but here we are using CS memory).
            this.refreshActiveTabContext();
          });
        });
      }
    }
  }

  dismissDevtoolsInfo() {
    this.showDevtoolsInfo = false;
  }
}