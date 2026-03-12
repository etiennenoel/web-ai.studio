import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';

declare const chrome: any;

@Component({
  selector: 'app-overview',
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
  standalone: false
})
export class OverviewComponent implements OnInit {
  sessionsByOrigin: { [origin: string]: any[] } = {};
  origins: string[] = [];
  loading = true;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.fetchActiveSessions();
    
    // Listen for updates from the background script or content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'api_call_logged' || request.action === 'log_api_call') {
          this.ngZone.run(() => {
            // Give the DB a tiny bit of time to actually write before fetching
            setTimeout(() => this.fetchActiveSessions(), 100);
          });
        }
      });
    }
  }

  fetchActiveSessions() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_all_history' }, (response: any) => {
        if (response && response.data) {
          this.ngZone.run(() => {
            this.processHistory(response.data);
          });
        }
      });
    }
  }

  processHistory(history: any[]) {
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
      
      const sessions = Object.keys(sessionsMap).map(sid => {
        const calls = sessionsMap[sid];
        // sort calls by timestamp
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

  clearHistory(origin: string) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'clear_api_history', payload: { origin } }, (response: any) => {
        this.ngZone.run(() => {
          this.fetchActiveSessions();
        });
      });
    }
  }
}
