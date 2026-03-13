import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare const chrome: any;

export interface HistoryItem {
  id: string;
  sessionId: string;
  api: string;
  method: string;
  origin: string;
  timestamp: number;
  timestamps: any;
  options?: any;
  args?: any[];
  errorMessage?: string;
  response?: any;
  mediaUrls?: { type: string, url: SafeResourceUrl }[];
  mediaUrlsLoaded?: boolean;
  displayOptions?: string;
  displayArgs?: string;
  displayResponse?: string;
}

export interface SessionGroup {
  sessionId: string;
  api: string;
  timestamp: number;
  createItem: HistoryItem | null;
  methodItems: HistoryItem[];
  computedStatus?: 'completed' | 'error' | 'running';
}

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  standalone: false
})
export class HistoryComponent implements OnInit {
  rawItems: HistoryItem[] = [];
  sessionGroups: SessionGroup[] = [];
  filteredGroups: SessionGroup[] = [];
  displayedGroups: SessionGroup[] = [];
  displayLimit: number = 50;

  loadMore() {
    this.displayLimit += 50;
    this.displayedGroups = this.filteredGroups.slice(0, this.displayLimit);
  }
  
  timeFilter: '5m' | '1h' | '24h' | 'all' = 'all';
  apiFilter: string[] = [];
  isApiDropdownOpen: boolean = false;
  
  isLoading = true;
  error: string | null = null;
  wrapApiEnabled: boolean = true;
  
  availableApis: string[] = ['LanguageModel', 'Summarizer', 'Translator', 'LanguageDetector', 'Writer', 'Rewriter', 'Proofreader'];
  apiColors: Record<string, string> = {
    'LanguageModel': '#8ab4f8',
    'Summarizer': '#f28b82',
    'Translator': '#81c995',
    'LanguageDetector': '#fbbc04',
    'Writer': '#c58af9',
    'Rewriter': '#f48fb1',
    'Proofreader': '#80cbc4'
  };

  showClearConfirm: boolean = false;
  expandedSessions: Set<string> = new Set<string>();

  timeFilterCounts = { 'all': 0, '24h': 0, '1h': 0, '5m': 0 };
  apiFilterCounts: Record<string, number> = {};

  constructor(private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer, private ngZone: NgZone) {}

  ngOnInit() {
    this.availableApis.forEach(api => this.apiFilterCounts[api] = 0);
    this.loadHistory();

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'api_call_logged' || request.action === 'log_api_call') {
          this.ngZone.run(() => {
            // Add a small delay to allow IDB to save before fetching
            setTimeout(() => this.loadHistory(), 100);
          });
        }
      });
    }
  }

  loadHistory() {
    this.isLoading = true;
    this.error = null;
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_setting', key: 'wrap_api', defaultValue: true }, (response: any) => {
        this.ngZone.run(() => {
          if (!chrome.runtime.lastError) {
            this.wrapApiEnabled = response?.value !== false;
          }
        });
      });

      chrome.runtime.sendMessage({
        action: 'get_all_history'
      }, (response: any) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          if (chrome.runtime.lastError) {
            this.error = chrome.runtime.lastError.message;
          } else if (response && response.error) {
            this.error = response.error;
          } else {
            this.rawItems = (response && response.data) || [];
            this.groupSessions();
          }
          this.cdr.detectChanges();
        });
      });
    } else {
      // Mock data for local testing outside extension
      this.rawItems = [
        { id: '1', sessionId: 's1', api: 'LanguageModel', method: 'create', origin: '', timestamp: Date.now() - 61000, timestamps: { create: Date.now() - 61000, completed: Date.now() - 60500 }, options: { temperature: 0.8 } },
        { id: '2', sessionId: 's1', api: 'LanguageModel', method: 'promptStreaming', origin: '', timestamp: Date.now() - 60000, timestamps: { execute: Date.now() - 60000, first_token: Date.now() - 59000, completed: Date.now() - 58000 }, args: ['Write a poem'] },
        { id: '3', sessionId: 's2', api: 'Summarizer', method: 'create', origin: '', timestamp: Date.now() - 3601000, timestamps: { create: Date.now() - 3601000, completed: Date.now() - 3600500 } },
        { id: '4', sessionId: 's2', api: 'Summarizer', method: 'summarize', origin: '', timestamp: Date.now() - 3600000, timestamps: { execute: Date.now() - 3600000, completed: Date.now() - 3595000 }, args: ['Long text...'] }
      ];
      this.isLoading = false;
      this.groupSessions();
    }
  }

  groupSessions() {
    const groupsMap = new Map<string, SessionGroup>();
    
    for (const item of this.rawItems) {
      const sid = item.sessionId || item.id;
      if (!groupsMap.has(sid)) {
        groupsMap.set(sid, {
          sessionId: sid,
          api: item.api,
          timestamp: item.timestamp,
          createItem: null,
          methodItems: []
        });
      }
      
      const group = groupsMap.get(sid)!;
      // Use the oldest timestamp for the group timestamp
      if (item.timestamp < group.timestamp) {
        group.timestamp = item.timestamp;
      }
      
      if (item.method === 'create') {
        group.createItem = item;
      } else {
        group.methodItems.push(item);
      }
    }

    // Sort method items by timestamp within group
    for (const group of groupsMap.values()) {
      group.methodItems.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Sort groups descending by timestamp
    this.sessionGroups = Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    this.applyFilters();
  }

  getDisplayOptions(item: any): string {
    if (item.displayOptions !== undefined) return item.displayOptions;
    item.displayOptions = item.options ? this.formatForDisplay(item.options) : '{}';
    return item.displayOptions;
  }

  getDisplayArgs(item: any): string {
    if (item.displayArgs !== undefined) return item.displayArgs;
    item.displayArgs = item.args && item.args.length > 0 ? this.formatForDisplay(item.args) : '[]';
    return item.displayArgs;
  }

  getDisplayResponse(item: any): string {
    if (item.displayResponse !== undefined) return item.displayResponse;
    item.displayResponse = item.response !== undefined ? this.formatForDisplay(item.response) : '';
    return item.displayResponse;
  }

  getMediaUrlsList(item: any): { type: string, url: SafeResourceUrl }[] {
    if (!item.mediaUrls) {
      item.mediaUrls = this.extractMediaUrls(item);
    }
    return item.mediaUrls;
  }

  formatForDisplay(obj: any): string {
    if (obj === undefined) return '';
    try {
      return JSON.stringify(obj, (key, value) => {
        if (key === 'dataUrl' && typeof value === 'string' && value.length > 100) {
          return `<Base64 Data: ${Math.round(value.length / 1024)}KB>`;
        }
        if (Array.isArray(value) && value.length > 100) {
          // Truncate large arrays to prevent stringify from freezing the UI thread
          const truncated = value.slice(0, 10);
          truncated.push(`... and ${value.length - 10} more items`);
          return truncated;
        }
        if (typeof value === 'string' && value.length > 50000) {
          return value.substring(0, 1000) + `\n... [String truncated: ${Math.round(value.length / 1024)}KB total]`;
        }
        return value;
      }, 2);
    } catch (e) {
      return String(obj);
    }
  }

  extractMediaUrls(item: any): { type: string, url: SafeResourceUrl }[] {
    const urls: { type: string, url: SafeResourceUrl }[] = [];
    const seen = new Set<any>();
    let count = 0;
    
    const search = (obj: any, depth: number) => {
      if (!obj) return;
      if (typeof obj !== 'object') return;
      if (seen.has(obj)) return;
      if (depth > 10 || count > 2000) return; // guard against infinite/massive loops
      
      seen.add(obj);
      count++;
      
      if (obj.__type === 'Blob' && obj.dataUrl) {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(obj.dataUrl);
        if (obj.type && obj.type.startsWith('audio/')) {
          urls.push({ type: 'audio', url: safeUrl });
        } else if (obj.type && obj.type.startsWith('image/')) {
          urls.push({ type: 'image', url: safeUrl });
        } else if (obj.dataUrl.startsWith('data:audio/')) {
           urls.push({ type: 'audio', url: safeUrl });
        } else if (obj.dataUrl.startsWith('data:image/')) {
           urls.push({ type: 'image', url: safeUrl });
        } else {
           if (obj.dataUrl.includes('audio')) {
               urls.push({ type: 'audio', url: safeUrl });
           } else {
               urls.push({ type: 'image', url: safeUrl });
           }
        }
        return; // Stop recurring into Blob fields
      }
      
      const keys = Object.keys(obj);
      for (const key of keys) {
        search(obj[key], depth + 1);
      }
    };
    
    if (item.args) search(item.args, 0);
    if (item.options) search(item.options, 0);
    
    return urls;
  }

  applyFilters() {
    const now = Date.now();
    const limits = {
      '5m': now - 5 * 60 * 1000,
      '1h': now - 60 * 60 * 1000,
      '24h': now - 24 * 60 * 60 * 1000,
    };
    const currentTimeLimit = this.timeFilter === 'all' ? 0 : limits[this.timeFilter];
    
    // Reset counts
    this.timeFilterCounts = { 'all': 0, '24h': 0, '1h': 0, '5m': 0 };
    this.availableApis.forEach(api => this.apiFilterCounts[api] = 0);
    
    this.filteredGroups = [];
    
    for (const group of this.sessionGroups) {
      const matchCurrentTime = this.timeFilter === 'all' || group.timestamp >= currentTimeLimit;
      const matchCurrentApi = this.apiFilter.length === 0 || this.apiFilter.includes(group.api);
      
      if (matchCurrentTime && matchCurrentApi) {
        this.filteredGroups.push(group);
      }
      
      // Calculate time filter counts ignoring the current time filter itself (but respecting API filter)
      if (matchCurrentApi) {
        this.timeFilterCounts['all']++;
        if (group.timestamp >= limits['24h']) this.timeFilterCounts['24h']++;
        if (group.timestamp >= limits['1h']) this.timeFilterCounts['1h']++;
        if (group.timestamp >= limits['5m']) this.timeFilterCounts['5m']++;
      }
      
      // Calculate API filter counts ignoring the current API filter itself (but respecting time filter)
      if (matchCurrentTime) {
        if (this.apiFilterCounts[group.api] !== undefined) {
          this.apiFilterCounts[group.api]++;
        }
      }
    }
    
    this.displayedGroups = this.filteredGroups.slice(0, this.displayLimit);
  }

  setTimeFilter(filter: '5m' | '1h' | '24h' | 'all') {
    this.timeFilter = filter;
    this.applyFilters();
  }

  getTimeFilterCount(filter: '5m' | '1h' | '24h' | 'all'): number {
    const now = Date.now();
    let timeLimit = 0;
    
    switch (filter) {
      case '5m': timeLimit = now - 5 * 60 * 1000; break;
      case '1h': timeLimit = now - 60 * 60 * 1000; break;
      case '24h': timeLimit = now - 24 * 60 * 60 * 1000; break;
    }
    
    return this.sessionGroups.filter(group => {
      const matchTime = filter === 'all' || group.timestamp >= timeLimit;
      const matchApi = this.apiFilter.length === 0 || this.apiFilter.includes(group.api);
      return matchTime && matchApi;
    }).length;
  }

  getApiFilterCount(api: string): number {
    const now = Date.now();
    let timeLimit = 0;
    
    switch (this.timeFilter) {
      case '5m': timeLimit = now - 5 * 60 * 1000; break;
      case '1h': timeLimit = now - 60 * 60 * 1000; break;
      case '24h': timeLimit = now - 24 * 60 * 60 * 1000; break;
    }

    return this.sessionGroups.filter(group => {
      const matchTime = this.timeFilter === 'all' || group.timestamp >= timeLimit;
      const matchApi = group.api === api;
      return matchTime && matchApi;
    }).length;
  }

  toggleApiDropdown() {
    this.isApiDropdownOpen = !this.isApiDropdownOpen;
  }

  closeApiDropdown() {
    this.isApiDropdownOpen = false;
  }

  toggleApiFilter(api: string, event: Event) {
    event.stopPropagation();
    if (this.apiFilter.includes(api)) {
      this.apiFilter = this.apiFilter.filter(a => a !== api);
    } else {
      this.apiFilter.push(api);
    }
    this.applyFilters();
  }

  clearApiFilter(event?: Event) {
    if (event) event.stopPropagation();
    this.apiFilter = [];
    this.applyFilters();
  }

  promptClearHistory() {
    this.showClearConfirm = true;
  }

  cancelClearHistory() {
    this.showClearConfirm = false;
  }

  executeClearHistory() {
    this.showClearConfirm = false;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'clear_all_history'
      }, (response: any) => {
        this.ngZone.run(() => {
          if (chrome.runtime.lastError) {
            this.error = chrome.runtime.lastError.message;
          } else if (response && response.error) {
            this.error = response.error;
          } else {
            this.loadHistory();
          }
          this.cdr.detectChanges();
        });
      });
    } else {
      this.rawItems = [];
      this.groupSessions();
    }
  }

  toggleExpand(sessionId: string, event: Event) {
    if ((event.target as HTMLElement).closest('button')) return;
    if (this.expandedSessions.has(sessionId)) {
      this.expandedSessions.delete(sessionId);
    } else {
      this.expandedSessions.add(sessionId);
      
      const group = this.sessionGroups.find(g => g.sessionId === sessionId);
      if (group && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const fetchMedia = (item: HistoryItem) => {
          if (!item.mediaUrlsLoaded && ((item.args as any)?.hasMedia || item.options?.hasMedia)) {
            chrome.runtime.sendMessage({
              action: 'get_history_item',
              payload: { id: item.id }
            }, (response: any) => {
              this.ngZone.run(() => {
                if (response && response.data && !chrome.runtime.lastError) {
                  item.args = response.data.args;
                  item.options = response.data.options;
                  item.mediaUrls = this.extractMediaUrls(item);
                  item.displayOptions = undefined;
                  item.displayArgs = undefined;
                  item.mediaUrlsLoaded = true;
                  this.cdr.detectChanges();
                }
              });
            });
          }
        };

        if (group.createItem) fetchMedia(group.createItem);
        group.methodItems.forEach(fetchMedia);
      }
    }
  }

  isExpanded(sessionId: string): boolean {
    return this.expandedSessions.has(sessionId);
  }

  deleteSession(sessionId: string) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const sessionItem = this.rawItems.find(item => item.sessionId === sessionId);
      const origin = sessionItem ? sessionItem.origin : null;
      
      if (!origin) {
        this.error = 'Could not find origin for this session.';
        this.cdr.detectChanges();
        return;
      }
      
      chrome.runtime.sendMessage({
        action: 'delete_api_session',
        payload: { origin, sessionId }
      }, (response: any) => {
        this.ngZone.run(() => {
          if (chrome.runtime.lastError) {
            this.error = chrome.runtime.lastError.message;
          } else if (response && response.error) {
            this.error = response.error;
          } else {
            this.loadHistory();
          }
          this.cdr.detectChanges();
        });
      });
    } else {
      this.rawItems = this.rawItems.filter(item => item.sessionId !== sessionId);
      this.groupSessions();
    }
  }
  
  getCreateDuration(item: any): number | null {
    if (item?.timestamps?.create && item?.timestamps?.completed) {
      return item.timestamps.completed - item.timestamps.create;
    }
    if (item?.timestamps?.create && item?.timestamps?.error) {
      return item.timestamps.error - item.timestamps.create;
    }
    return null;
  }
  
  getDuration(item: any): number | null {
    if (item?.timestamps?.execute && item?.timestamps?.completed) {
      return item.timestamps.completed - item.timestamps.execute;
    }
    if (item?.timestamps?.execute && item?.timestamps?.error) {
      return item.timestamps.error - item.timestamps.execute;
    }
    return null;
  }
  
  getTtft(item: any): number | null {
    if (item?.timestamps?.execute && item?.timestamps?.first_token) {
      return item.timestamps.first_token - item.timestamps.execute;
    }
    return null;
  }

  getGroupStatus(group: SessionGroup): 'completed' | 'error' | 'running' {
    if (group.computedStatus) return group.computedStatus;

    if (group.createItem?.errorMessage) {
      group.computedStatus = 'error';
      return 'error';
    }
    
    let hasRunning = false;
    for (const method of group.methodItems) {
      if (method.errorMessage) {
        group.computedStatus = 'error';
        return 'error';
      }
      if (method.response === undefined) hasRunning = true;
    }
    
    group.computedStatus = hasRunning ? 'running' : 'completed';
    return group.computedStatus;
  }

  getMediaUrls(item: any): { type: string, url: SafeResourceUrl }[] {
    const urls: { type: string, url: SafeResourceUrl }[] = [];
    
    const search = (obj: any) => {
      if (!obj) return;
      if (typeof obj !== 'object') return;
      
      if (obj.__type === 'Blob' && obj.dataUrl) {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(obj.dataUrl);
        if (obj.type && obj.type.startsWith('audio/')) {
          urls.push({ type: 'audio', url: safeUrl });
        } else if (obj.type && obj.type.startsWith('image/')) {
          urls.push({ type: 'image', url: safeUrl });
        } else if (obj.dataUrl.startsWith('data:audio/')) {
           urls.push({ type: 'audio', url: safeUrl });
        } else if (obj.dataUrl.startsWith('data:image/')) {
           urls.push({ type: 'image', url: safeUrl });
        } else {
           // fallback guessing
           if (obj.dataUrl.includes('audio')) {
               urls.push({ type: 'audio', url: safeUrl });
           } else {
               urls.push({ type: 'image', url: safeUrl });
           }
        }
        return;
      }
      
      for (const key of Object.keys(obj)) {
        search(obj[key]);
      }
    };
    
    if (item.args) search(item.args);
    if (item.options) search(item.options);
    
    return urls;
  }

  provideFeedback(group: SessionGroup) {
    const dataStr = JSON.stringify(group, null, 2);
    const issueBody = `I'm reporting an issue with the following session:\n\n\`\`\`json\n${dataStr}\n\`\`\`\n\n**Additional Feedback:**\n`;
    const encodedBody = encodeURIComponent(issueBody);
    const url = `https://github.com/etiennenoel/web-ai.studio/issues/new?title=Feedback%20on%20${group.api}%20Session&body=${encodedBody}`;
    window.open(url, '_blank');
  }
}
