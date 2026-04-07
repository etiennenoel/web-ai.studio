import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy, AfterViewInit, NgZone, HostListener } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Chart } from 'chart.js/auto';
import { SessionGroup } from '../history/history.component';
import { formatDistanceToNow } from 'date-fns';

declare const chrome: any;

function calculatePercentile(data: number[], percentile: number) {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function average(data: number[]) {
  if (data.length === 0) return 0;
  return data.reduce((a,b) => a+b, 0) / data.length;
}

interface ApiConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  hex: string;
  bg: string;
  border: string;
  activeBg: string;
  activeText: string;
}

@Component({
  selector: 'app-performance',
  templateUrl: './performance.component.html',
  standalone: false
})
export class PerformanceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('performanceChart') performanceChartRef!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;

  rawItems: any[] = [];
  sessionGroups: SessionGroup[] = [];
  filteredGroups: SessionGroup[] = [];
  displayedGroups: SessionGroup[] = [];
  displayLimit: number = 50;
  
  countFilter: '50' | '100' | '250' | '500' | 'all' = '50';
  
  apiConfigs: ApiConfig[] = [
    { id: 'LanguageModel', name: 'Prompt API', icon: 'fa-terminal', color: 'text-blue-500 dark:text-blue-400', hex: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-400/10', border: 'border-blue-200 dark:border-blue-400/20', activeBg: 'bg-blue-600 dark:bg-blue-500', activeText: 'text-white' },
    { id: 'Summarizer', name: 'Summarizer API', icon: 'fa-message', color: 'text-emerald-500 dark:text-emerald-400', hex: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-400/10', border: 'border-emerald-200 dark:border-emerald-400/20', activeBg: 'bg-emerald-600 dark:bg-emerald-500', activeText: 'text-white' },
    { id: 'Translator', name: 'Translator API', icon: 'fa-language', color: 'text-amber-500 dark:text-amber-400', hex: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-400/10', border: 'border-amber-200 dark:border-amber-400/20', activeBg: 'bg-amber-500 dark:bg-amber-500', activeText: 'text-white' },
    { id: 'LanguageDetector', name: 'Language Detector', icon: 'fa-magnifying-glass', color: 'text-violet-500 dark:text-violet-400', hex: '#8b5cf6', bg: 'bg-violet-100 dark:bg-violet-400/10', border: 'border-violet-200 dark:border-violet-400/20', activeBg: 'bg-violet-600 dark:bg-violet-500', activeText: 'text-white' },
    { id: 'Writer', name: 'Writer API', icon: 'fa-pen-nib', color: 'text-pink-500 dark:text-pink-400', hex: '#ec4899', bg: 'bg-pink-100 dark:bg-pink-400/10', border: 'border-pink-200 dark:border-pink-400/20', activeBg: 'bg-pink-600 dark:bg-pink-500', activeText: 'text-white' },
    { id: 'Rewriter', name: 'Rewriter API', icon: 'fa-pen-to-square', color: 'text-rose-500 dark:text-rose-400', hex: '#f43f5e', bg: 'bg-rose-100 dark:bg-rose-400/10', border: 'border-rose-200 dark:border-rose-400/20', activeBg: 'bg-rose-600 dark:bg-rose-500', activeText: 'text-white' },
    { id: 'Proofreader', name: 'Proofreader API', icon: 'fa-spell-check', color: 'text-teal-500 dark:text-teal-400', hex: '#14b8a6', bg: 'bg-teal-100 dark:bg-teal-400/10', border: 'border-teal-200 dark:border-teal-400/20', activeBg: 'bg-teal-600 dark:bg-teal-500', activeText: 'text-white' },
  ];

  selectedApis: Set<string> = new Set<string>(this.apiConfigs.map(a => a.id));
  selectedCall: SessionGroup | null = null;
  
  isLoading = true;
  error: string | null = null;

  inspectorWidth = 550;
  isResizingInspector = false;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone, private sanitizer: DomSanitizer) {}

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizingInspector) return;
    const newWidth = window.innerWidth - event.clientX;
    this.inspectorWidth = Math.max(300, Math.min(newWidth, window.innerWidth - 100));
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isResizingInspector) {
      this.isResizingInspector = false;
      document.body.style.cursor = 'default';
    }
  }

  startResizeInspector(event: MouseEvent) {
    this.isResizingInspector = true;
    document.body.style.cursor = 'ew-resize';
    event.preventDefault();
  }

  ngOnInit() {
    this.loadHistory();

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
        if (request.action === 'api_call_logged' || request.action === 'log_api_call') {
          this.ngZone.run(() => {
            setTimeout(() => this.loadHistory(), 100);
          });
        }
      });
    }
  }

  ngAfterViewInit() {
    // Left intentionally blank as chart was removed
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadMore() {
    this.displayLimit += 50;
    this.displayedGroups = this.filteredGroups.slice(0, this.displayLimit);
  }

  getTotalSelectedCount(): number {
    return this.sessionGroups.filter(g => this.selectedApis.has(g.api)).length;
  }

  getRelativeTime(timestamp: number): string {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch(e) {
      return '';
    }
  }

  hasText(group: SessionGroup): boolean {
    return true;
  }

  hasImage(group: SessionGroup): boolean {
    return !!group.createItem?.hasImage || group.methodItems.some((item: any) => item.hasImage);
  }

  hasAudio(group: SessionGroup): boolean {
    return !!group.createItem?.hasAudio || group.methodItems.some((item: any) => item.hasAudio);
  }

  getMediaUrlsList(item: any): { type: string; url: SafeResourceUrl }[] {
    if (!item.mediaUrls) {
      item.mediaUrls = this.extractMediaUrls(item);
    }
    return item.mediaUrls;
  }

  extractMediaUrls(item: any): { type: string; url: SafeResourceUrl }[] {
    const urls: { type: string; url: SafeResourceUrl }[] = [];
    const seen = new Set<any>();
    let count = 0;

    const search = (obj: any, depth: number) => {
      if (!obj) return;
      if (typeof obj !== 'object') return;
      if (seen.has(obj)) return;
      if (depth > 10 || count > 2000) return;

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
        return;
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

  get aggregateStats() {
    if (this.selectedApis.size === 0) return { ttft: { avg: 0, p90: 0, p99: 0 }, create: { avg: 0, p90: 0, p99: 0 }, inference: { avg: 0, p90: 0, p99: 0 }, tokensPerSec: { avg: 0, p90: 0, p99: 0 }, charsPerSec: { avg: 0, p90: 0, p99: 0 } };
    
    let ttft: number[] = [];
    let create: number[] = [];
    let inference: number[] = [];
    let tokensPerSec: number[] = [];
    let charsPerSec: number[] = [];

    for (const group of this.filteredGroups) {
      if (this.selectedApis.has(group.api)) {
        if (group.computedCreateTime !== null && group.computedCreateTime !== undefined) {
          create.push(group.computedCreateTime);
        }
        if (group.computedInferenceTime !== null && group.computedInferenceTime !== undefined) {
          inference.push(group.computedInferenceTime);
        }
        if (group.computedTtft !== null && group.computedTtft !== undefined) {
          ttft.push(group.computedTtft);
        }
        if (group.computedTokensPerSecond !== null && group.computedTokensPerSecond !== undefined && group.computedTokensPerSecond !== -1) {
          tokensPerSec.push(group.computedTokensPerSecond);
        }
        if (group.computedCharsPerSecond !== null && group.computedCharsPerSecond !== undefined) {
          charsPerSec.push(group.computedCharsPerSecond);
        }
      }
    }

    return {
      ttft: { avg: Math.round(average(ttft)), p90: Math.round(calculatePercentile(ttft, 90)), p99: Math.round(calculatePercentile(ttft, 99)) },
      create: { avg: Math.round(average(create)), p90: Math.round(calculatePercentile(create, 90)), p99: Math.round(calculatePercentile(create, 99)) },
      inference: { avg: Math.round(average(inference)), p90: Math.round(calculatePercentile(inference, 90)), p99: Math.round(calculatePercentile(inference, 99)) },
      tokensPerSec: { avg: Math.round(average(tokensPerSec)), p90: Math.round(calculatePercentile(tokensPerSec, 90)), p99: Math.round(calculatePercentile(tokensPerSec, 99)) },
      charsPerSec: { avg: Math.round(average(charsPerSec)), p90: Math.round(calculatePercentile(charsPerSec, 90)), p99: Math.round(calculatePercentile(charsPerSec, 99)) }
    };
  }

  getApiDef(id: string): ApiConfig {
    return this.apiConfigs.find(a => a.id === id) || this.apiConfigs[0];
  }

  loadHistory() {
    this.isLoading = true;
    this.error = null;

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
      this.rawItems = [];
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
      if (item.timestamp < group.timestamp) {
        group.timestamp = item.timestamp;
      }
      
      if (item.method === 'create') {
        group.createItem = item;
      } else {
        group.methodItems.push(item);
      }
    }

    for (const group of groupsMap.values()) {
      group.methodItems.sort((a, b) => a.timestamp - b.timestamp);
      group.computedStatus = this.getGroupStatus(group);
      group.computedTtft = this.getGroupTtft(group);
      group.computedCreateTime = this.getGroupCreateTime(group);
      group.computedInferenceTime = this.getGroupInferenceTime(group);
    }

    this.sessionGroups = Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp); // Sort descending (newest first)
    this.applyFilters();
  }

  applyFilters() {
    let countLimit = this.sessionGroups.length;
    switch (this.countFilter) {
      case '50': countLimit = 50; break;
      case '100': countLimit = 100; break;
      case '250': countLimit = 250; break;
      case '500': countLimit = 500; break;
    }
    
    let selectedApiGroups = this.sessionGroups.filter(g => this.selectedApis.has(g.api));
    this.filteredGroups = selectedApiGroups.slice(0, countLimit);

    this.displayLimit = 50;
    this.displayedGroups = this.filteredGroups.slice(0, this.displayLimit);
  }

  setCountFilter(filter: '50' | '100' | '250' | '500' | 'all') {
    this.countFilter = filter;
    this.applyFilters();
  }

  toggleApi(id: string) {
    if (this.selectedApis.has(id)) {
      if (this.selectedApis.size === 1) return; // Prevent deselecting all
      this.selectedApis.delete(id);
    } else {
      this.selectedApis.add(id);
    }
    this.applyFilters();
  }

  showClearConfirm: boolean = false;

  executeClearHistory() {
    if (typeof chrome !== 'undefined' && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
        if (!isException && origin) {
          chrome.runtime.sendMessage({
            action: 'clear_api_history',
            payload: { origin }
          }, (response: any) => {
            if (response && response.success) {
              this.rawItems = [];
              this.groupSessions();
              this.selectedCall = null;
              this.showClearConfirm = false;
              this.cdr.detectChanges();
            }
          });
        }
      });
    }
  }

  promptClearHistory() {
    this.showClearConfirm = true;
  }

  cancelClearHistory() {
    this.showClearConfirm = false;
  }

  selectCall(call: SessionGroup | null) {
    this.selectedCall = call;

    if (call && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const fetchMedia = (item: any) => {
        if (!item.mediaUrlsLoaded && (item.hasMedia || item.hasImage || item.hasAudio)) {
          chrome.runtime.sendMessage(
            {
              action: 'get_history_item',
              payload: { id: item.id },
            },
            (response: any) => {
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
            },
          );
        }
      };

      if (call.createItem) fetchMedia(call.createItem);
      call.methodItems.forEach(fetchMedia);
    }
  }

  formatForDisplay(obj: any): string {
    if (obj === undefined) return '';
    try {
      return JSON.stringify(
        obj,
        (key, value) => {
          if (key === 'dataUrl' && typeof value === 'string' && value.length > 100) {
            return `<Base64 Data: ${Math.round(value.length / 1024)}KB>`;
          }
          if (Array.isArray(value) && value.length > 100) {
            const truncated = value.slice(0, 10);
            truncated.push(`... and ${value.length - 10} more items`);
            return truncated;
          }
          if (typeof value === 'string' && value.length > 50000) {
            return (
              value.substring(0, 1000) +
              `\n... [String truncated: ${Math.round(value.length / 1024)}KB total]`
            );
          }
          return value;
        },
        2,
      );
    } catch (e) {
      return String(obj);
    }
  }

  getLifecycleSteps(group: SessionGroup): any[] {
    const steps: any[] = [];
    
    if (group.createItem) {
      const createDuration = this.getCreateDuration(group.createItem) ?? '-';
      steps.push({
        item: group.createItem,
        step: 'create',
        duration: createDuration !== '-' ? `${createDuration}ms` : '-',
        icon: 'fa-database',
        iconColor: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-400/10',
        border: 'border-amber-200 dark:border-amber-400/30',
        payload: group.createItem.options ? this.formatForDisplay(group.createItem.options) : null,
        error: group.createItem.errorMessage
      });
    } else {
      steps.push({
        item: null,
        step: 'create (missing)',
        duration: '-',
        icon: 'fa-database',
        iconColor: 'text-gray-400 dark:text-gray-500',
        bg: 'bg-gray-100 dark:bg-gray-800',
        border: 'border-gray-300 dark:border-gray-700'
      });
    }

    for (const item of group.methodItems) {
      const duration = this.getDuration(item) ?? '-';
      const ttft = this.getTtft(item) ?? '-';
      
      const payloadObj = { ...(item.args ? { args: item.args } : {}) };
      
      steps.push({
        item: item,
        step: item.method,
        duration: duration !== '-' ? `${duration}ms` : '-',
        ttft: ttft !== '-' ? `${ttft}ms` : null,
        icon: 'fa-play-circle',
        iconColor: 'text-blue-500 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-400/10',
        border: 'border-blue-200 dark:border-blue-400/30',
        payload: Object.keys(payloadObj).length > 0 ? this.formatForDisplay(payloadObj) : null,
        error: item.errorMessage
      });

      if (item.response !== undefined) {
        steps.push({
          item: null,
          step: 'response',
          duration: '-',
          icon: 'fa-square-check',
          iconColor: 'text-emerald-500 dark:text-emerald-400',
          bg: 'bg-emerald-100 dark:bg-emerald-400/10',
          border: 'border-emerald-200 dark:border-emerald-400/30',
          text: typeof item.response === 'string' ? item.response : JSON.stringify(item.response, null, 2),
          isFinal: true
        });
      }
    }
    
    return steps;
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

  getGroupCreateTime(group: SessionGroup): number | null {
    if (group.createItem) return this.getCreateDuration(group.createItem);
    return null;
  }

  getGroupTtft(group: SessionGroup): number | null {
    for (const item of group.methodItems) {
      const ttft = this.getTtft(item);
      if (ttft !== null) return ttft;
    }
    return null;
  }

  getGroupInferenceTime(group: SessionGroup): number | null {
    for (const item of group.methodItems) {
      const duration = this.getDuration(item);
      if (duration !== null) return duration;
    }
    return null;
  }

  getGroupTokensPerSecond(group: SessionGroup): number | null {
    for (const item of group.methodItems) {
      if (item.chunkCount !== undefined && item.chunkCount !== null) {
        const duration = this.getDuration(item);
        if (duration && duration > 0) {
          if (item.chunkCount === -1) return -1;
          return item.chunkCount / (duration / 1000);
        }
      }
    }
    return null;
  }

  getGroupCharsPerSecond(group: SessionGroup): number | null {
    for (const item of group.methodItems) {
      if (item.response && typeof item.response === 'string') {
        const duration = this.getDuration(item);
        if (duration && duration > 0) {
          return item.response.length / (duration / 1000);
        }
      }
    }
    return null;
  }

  getGroupInputTokens(group: SessionGroup): number | null {
    for (const item of group.methodItems) {
      if (item.inputTokenCount !== undefined && item.inputTokenCount !== null) return item.inputTokenCount;
    }
    return null;
  }

  getGroupInputLength(group: SessionGroup): number | null {
    for (const item of group.methodItems) {
      if (item.inputLength !== undefined && item.inputLength !== null) return item.inputLength;
    }
    return null;
  }

  getGroupStatus(group: SessionGroup): 'completed' | 'error' | 'running' {
    if (group.createItem?.errorMessage) return 'error';
    
    if (group.methodItems.length === 0) return 'running';

    let hasRunning = false;
    let hasResponse = false;

    for (const method of group.methodItems) {
      if (method.errorMessage) return 'error';
      if (method.response === undefined) {
        hasRunning = true;
      } else {
        hasResponse = true;
      }
    }
    
    if (hasRunning) return 'running';
    if (!hasResponse) return 'running';
    
    return 'completed';
  }
  
  provideFeedback(group: SessionGroup) {
    const dataStr = JSON.stringify(group, null, 2);
    const issueBody = `I'm reporting an issue with the following session:\n\n\`\`\`json\n${dataStr}\n\`\`\`\n\n**Additional Feedback:**\n`;
    const encodedBody = encodeURIComponent(issueBody);
    const url = `https://github.com/etiennenoel/web-ai.studio/issues/new?title=Feedback%20on%20${group.api}%20Session&body=${encodedBody}`;
    window.open(url, '_blank');
  }

  exportData() {
    if (typeof chrome !== 'undefined' && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
        const originToExport = (!isException && origin) ? origin : '';
        const itemsToExport = originToExport ? this.rawItems.filter(item => item.origin === originToExport) : this.rawItems;
        this.downloadExportFile(itemsToExport, originToExport, 'performance');
      });
    } else {
      this.downloadExportFile(this.rawItems, '', 'performance');
    }
  }

  private downloadExportFile(items: any[], origin: string, type: string) {
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const originSuffix = origin ? `-${origin.replace(/[^a-z0-9]/gi, '_')}` : '';
    const exportFileDefaultName = `webai-${type}-data${originSuffix}-${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
}
