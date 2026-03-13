import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
}

export interface SessionGroup {
  sessionId: string;
  api: string;
  timestamp: number;
  createItem: HistoryItem | null;
  methodItems: HistoryItem[];
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

  constructor(private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.isLoading = true;
    this.error = null;
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_setting', key: 'wrap_api', defaultValue: true }, (response: any) => {
        if (!chrome.runtime.lastError) {
          this.wrapApiEnabled = response?.value !== false;
        }
      });
    }

    if (typeof chrome !== 'undefined' && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
        if (isException || !origin) {
          this.error = 'Could not get inspected window origin.';
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }
        
        chrome.runtime.sendMessage({
          action: 'get_api_history',
          payload: { origin, apiName: 'all' }
        }, (response: any) => {
          this.isLoading = false;
          if (chrome.runtime.lastError) {
            this.error = chrome.runtime.lastError.message;
          } else if (response.error) {
            this.error = response.error;
          } else {
            this.rawItems = response.data || [];
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

  applyFilters() {
    const now = Date.now();
    let timeLimit = 0;
    
    switch (this.timeFilter) {
      case '5m': timeLimit = now - 5 * 60 * 1000; break;
      case '1h': timeLimit = now - 60 * 60 * 1000; break;
      case '24h': timeLimit = now - 24 * 60 * 60 * 1000; break;
    }
    
    this.filteredGroups = this.sessionGroups.filter(group => {
      const matchTime = this.timeFilter === 'all' || group.timestamp >= timeLimit;
      const matchApi = this.apiFilter.length === 0 || this.apiFilter.includes(group.api);
      return matchTime && matchApi;
    });
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
    if (typeof chrome !== 'undefined' && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
        if (isException || !origin) {
          this.error = 'Could not get inspected window origin.';
          this.cdr.detectChanges();
          return;
        }
        
        chrome.runtime.sendMessage({
          action: 'clear_api_history',
          payload: { origin }
        }, (response: any) => {
          if (chrome.runtime.lastError) {
            this.error = chrome.runtime.lastError.message;
          } else if (response.error) {
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
    }
  }

  isExpanded(sessionId: string): boolean {
    return this.expandedSessions.has(sessionId);
  }

  deleteSession(sessionId: string) {
    if (typeof chrome !== 'undefined' && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
        if (isException || !origin) {
          this.error = 'Could not get inspected window origin.';
          this.cdr.detectChanges();
          return;
        }
        
        chrome.runtime.sendMessage({
          action: 'delete_api_session',
          payload: { origin, sessionId }
        }, (response: any) => {
          if (chrome.runtime.lastError) {
            this.error = chrome.runtime.lastError.message;
          } else if (response.error) {
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
    if (group.createItem?.errorMessage) return 'error';
    
    let hasRunning = false;
    for (const method of group.methodItems) {
      if (method.errorMessage) return 'error';
      if (method.response === undefined) hasRunning = true;
    }
    
    return hasRunning ? 'running' : 'completed';
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
