import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
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

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone, private sanitizer: DomSanitizer) {}

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
    if (this.filteredGroups.length > 0) {
      this.updateChart();
    }
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
    if (this.selectedApis.size === 0) return { ttft: { avg: 0, p90: 0, p99: 0 }, create: { avg: 0, p90: 0, p99: 0 }, inference: { avg: 0, p90: 0, p99: 0 } };
    
    let ttft: number[] = [];
    let create: number[] = [];
    let inference: number[] = [];

    for (const group of this.filteredGroups) {
      if (this.selectedApis.has(group.api)) {
        if (group.createItem?.timestamps?.create && group.createItem.timestamps.completed) {
          create.push(group.createItem.timestamps.completed - group.createItem.timestamps.create);
        }
        for (const item of group.methodItems) {
          if (item.timestamps?.execute && item.timestamps?.completed) {
            inference.push(item.timestamps.completed - item.timestamps.execute);
          }
          if (item.timestamps?.execute && item.timestamps?.first_token) {
            ttft.push(item.timestamps.first_token - item.timestamps.execute);
          }
        }
      }
    }

    return {
      ttft: { avg: Math.round(average(ttft)), p90: Math.round(calculatePercentile(ttft, 90)), p99: Math.round(calculatePercentile(ttft, 99)) },
      create: { avg: Math.round(average(create)), p90: Math.round(calculatePercentile(create, 90)), p99: Math.round(calculatePercentile(create, 99)) },
      inference: { avg: Math.round(average(inference)), p90: Math.round(calculatePercentile(inference, 90)), p99: Math.round(calculatePercentile(inference, 99)) }
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

    setTimeout(() => {
      if (this.performanceChartRef) {
        this.updateChart();
      }
    }, 0);
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

  updateChart() {
    if (!this.performanceChartRef) return;
    const ctx = this.performanceChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const datasets: any[] = [];
    const apis = Array.from(this.selectedApis);

    for (const api of apis) {
      const apiGroups = this.filteredGroups.filter(g => g.api === api);
      if (apiGroups.length === 0) continue;

      const inferenceDataPoints: { x: number, y: number, session: string }[] = [];

      for (const group of apiGroups) {
        const x = group.timestamp;
        const session = group.sessionId.substring(0, 8);
        for (const item of group.methodItems) {
          if (item.timestamps?.execute && item.timestamps?.completed) {
            inferenceDataPoints.push({ x, y: item.timestamps.completed - item.timestamps.execute, session });
            break;
          }
        }
      }
      
      inferenceDataPoints.sort((a, b) => a.x - b.x);

      const apiDef = this.apiConfigs.find(a => a.id === api);
      const color = apiDef ? apiDef.hex : '#ffffff';

      if (inferenceDataPoints.length > 0) {
        datasets.push({
          label: apiDef?.name || api,
          apiName: api,
          data: inferenceDataPoints.map(p => ({ x: new Date(p.x).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' }), y: p.y, session: p.session })),
          borderColor: color,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
        });
      }
    }
    
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDark ? '#64748b' : '#64748b'; 
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const session = context.raw.session;
                return `${context.dataset.label}: ${context.raw.y.toFixed(0)}ms (Session: ${session})`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor },
            border: { display: false }
          },
          y: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor },
            border: { display: false },
            beginAtZero: true
          }
        }
      }
    });
  }
}
