import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { HistoryItem, SessionGroup } from '../history/history.component';

declare const chrome: any;

interface ApiPerformanceStats {
  api: string;
  success: number;
  errors: number;
  
  avgTtft: number;
  medianTtft: number;
  p90Ttft: number;
  p95Ttft: number;
  p99Ttft: number;
  
  avgCreate: number;
  medianCreate: number;
  p90Create: number;
  p95Create: number;
  p99Create: number;
  
  avgInference: number;
  medianInference: number;
  p90Inference: number;
  p95Inference: number;
  p99Inference: number;
}

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

function median(data: number[]) {
  return calculatePercentile(data, 50);
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
  apiGroupsCache: Record<string, SessionGroup[]> = {};
  paginatedApiGroups: Record<string, SessionGroup[]> = {};
  apiPages: Record<string, number> = {};
  pageSize = 10;
  
  countFilter: '50' | '100' | '250' | '500' | 'all' = 'all';
  availableApis: string[] = ['LanguageModel', 'Summarizer', 'Translator', 'LanguageDetector', 'Writer', 'Rewriter', 'Proofreader'];
  selectedApis: Set<string> = new Set<string>(['LanguageModel', 'Summarizer', 'Translator', 'LanguageDetector', 'Writer', 'Rewriter', 'Proofreader']);
  
  hoveredApi: string | null = null;

  expandedApi: string | null = null;
  hoveredSession: string | null = null;
  expandedSessions: Set<string> = new Set<string>();

  
  isLoading = true;
  error: string | null = null;
  
  stats: ApiPerformanceStats[] = [];
  apiColors: Record<string, string> = {
    'LanguageModel': '#8ab4f8',
    'Summarizer': '#f28b82',
    'Translator': '#81c995',
    'LanguageDetector': '#fbbc04',
    'Writer': '#c58af9',
    'Rewriter': '#f48fb1',
    'Proofreader': '#80cbc4'
  };

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

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
            for (const item of this.rawItems) {
              item.displayOptions = item.options ? this.formatForDisplay(item.options) : '{}';
              item.displayArgs = item.args && item.args.length > 0 ? this.formatForDisplay(item.args) : '[]';
              item.displayResponse = item.response !== undefined ? this.formatForDisplay(item.response) : '';
              item.computedCreateDuration = this.getCreateDuration(item);
              item.computedDuration = this.getDuration(item);
              item.computedTtft = this.getTtft(item);
            }
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
    }

    this.sessionGroups = Array.from(groupsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
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
    
    this.filteredGroups = this.sessionGroups.slice(Math.max(0, this.sessionGroups.length - countLimit));

    this.apiGroupsCache = {};
    this.paginatedApiGroups = {};
    for (const api of this.availableApis) {
      const allGroups = this.filteredGroups.filter(g => g.api === api).reverse();
      for (const group of allGroups) {
        if (group.computedStatus === undefined) {
          group.computedStatus = this.getGroupStatus(group);
        }
        if (group.computedTtft === undefined) {
          group.computedTtft = this.getGroupTtft(group);
        }
        if (group.computedCreateTime === undefined) {
          group.computedCreateTime = this.getGroupCreateTime(group);
        }
        if (group.computedInferenceTime === undefined) {
          group.computedInferenceTime = this.getGroupInferenceTime(group);
        }
      }
      this.apiGroupsCache[api] = allGroups;
      if (this.apiPages[api] === undefined) {
        this.apiPages[api] = 0;
      }
      this.updatePaginatedGroups(api);
    }

    this.calculateStats();
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

  getCountFilterCount(filter: '50' | '100' | '250' | '500' | 'all'): number {
    if (filter === 'all') return this.sessionGroups.length;
    const limit = parseInt(filter, 10);
    return Math.min(this.sessionGroups.length, limit);
  }

  toggleApiFilter(api: string, event?: Event) {
    if (event) event.stopPropagation();
    
    if (this.selectedApis.has(api)) {
      this.selectedApis.delete(api);
    } else {
      this.selectedApis.add(api);
    }

    this.updateChart();
  }

  toggleAllApis(event: Event) {
    if (event) event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    
    this.selectedApis.clear();
    if (checked) {
      for (const api of this.availableApis) {
        this.selectedApis.add(api);
      }
    }
    
    this.updateChart();
  }

  setHoveredApi(api: string | null) {
    if (this.hoveredApi === api) return;
    this.hoveredApi = api;
    this.cdr.detectChanges();
    
    if (this.chart) {
      this.chart.data.datasets.forEach((dataset: any, index: number) => {
        const baseColor = this.apiColors[dataset.apiName] || '#ffffff';
        if (api === null) {
          dataset.borderWidth = 2;
          dataset.borderColor = baseColor;
          dataset.backgroundColor = baseColor;
        } else if (dataset.apiName === api) {
          dataset.borderWidth = 4;
          dataset.borderColor = baseColor;
          dataset.backgroundColor = baseColor;
        } else {
          dataset.borderWidth = 1;
          dataset.borderColor = baseColor + '40'; // 25% opacity for dimming
          dataset.backgroundColor = baseColor + '40';
        }
      });
      this.chart.update('none');
    }
  }

  onRowHover(api: string) {
    this.setHoveredApi(api);
  }

  onRowLeave() {
    this.setHoveredApi(null);
  }


  toggleExpandApi(api: string) {
    if (this.expandedApi === api) {
      this.expandedApi = null;
    } else {
      this.expandedApi = api;
    }
  }

  updatePaginatedGroups(api: string) {
    const all = this.apiGroupsCache[api] || [];
    const page = this.apiPages[api] || 0;
    this.paginatedApiGroups[api] = all.slice(page * this.pageSize, (page + 1) * this.pageSize);
  }

  changePage(api: string, delta: number, event?: Event) {
    if (event) event.stopPropagation();
    const current = this.apiPages[api] || 0;
    const total = this.getGroupsCountForApi(api);
    const maxPage = Math.ceil(total / this.pageSize) - 1;
    let newPage = current + delta;
    if (newPage < 0) newPage = 0;
    if (maxPage >= 0 && newPage > maxPage) newPage = maxPage;
    
    if (newPage !== current) {
      this.apiPages[api] = newPage;
      this.updatePaginatedGroups(api);
    }
  }

  getPageStart(api: string): number {
    const page = this.apiPages[api] || 0;
    const total = this.getGroupsCountForApi(api);
    return total === 0 ? 0 : page * this.pageSize + 1;
  }

  getPageEnd(api: string): number {
    const page = this.apiPages[api] || 0;
    const total = this.getGroupsCountForApi(api);
    return Math.min((page + 1) * this.pageSize, total);
  }

  getGroupsForApi(api: string): SessionGroup[] {
    return this.paginatedApiGroups[api] || [];
  }

  getGroupsCountForApi(api: string): number {
    return (this.apiGroupsCache[api] || []).length;
  }

  trackByApi(index: number, stat: ApiPerformanceStats): string {
    return stat.api;
  }

  trackBySessionId(index: number, group: SessionGroup): string {
    return group.sessionId;
  }

  trackByHistoryItem(index: number, item: any): string {
    return item.id;
  }

  setHoveredSession(sessionId: string | null) {
    if (this.hoveredSession === sessionId) return;
    this.hoveredSession = sessionId;
    if (this.chart) {
      this.chart.update('none');
    }
  }

  getPointColor(ctx: any, defaultColor: string): string {
    if (!ctx.raw || !this.hoveredSession) return defaultColor;
    return ctx.raw.session === this.hoveredSession.substring(0, 8) ? '#ffffff' : defaultColor;
  }

  getPointRadius(ctx: any): number {
    if (!ctx.raw || !this.hoveredSession) return 4;
    return ctx.raw.session === this.hoveredSession.substring(0, 8) ? 8 : 4;
  }

  toggleExpandSession(sessionId: string, event: Event) {
    if ((event.target as HTMLElement).closest('button')) return;
    if (this.expandedSessions.has(sessionId)) {
      this.expandedSessions.delete(sessionId);
    } else {
      this.expandedSessions.add(sessionId);
    }
  }

  isSessionExpanded(sessionId: string): boolean {
    return this.expandedSessions.has(sessionId);
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
    if (group.createItem) {
      return this.getCreateDuration(group.createItem);
    }
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
    let hasRunning = false;
    for (const method of group.methodItems) {
      if (method.errorMessage) return 'error';
      if (method.response === undefined) hasRunning = true;
    }
    return hasRunning ? 'running' : 'completed';
  }
  
  provideFeedback(group: SessionGroup) {
    const dataStr = JSON.stringify(group, null, 2);
    const issueBody = `I'm reporting an issue with the following session:\n\n\`\`\`json\n${dataStr}\n\`\`\`\n\n**Additional Feedback:**\n`;
    const encodedBody = encodeURIComponent(issueBody);
    const url = `https://github.com/etiennenoel/web-ai.studio/issues/new?title=Feedback%20on%20${group.api}%20Session&body=${encodedBody}`;
    window.open(url, '_blank');
  }

  deleteSession(sessionId: string) {
    if (typeof chrome !== 'undefined' && chrome.devtools) {
      chrome.devtools.inspectedWindow.eval('window.location.origin', (origin: string, isException: any) => {
        if (!isException && origin) {
          chrome.runtime.sendMessage({
            action: 'delete_api_session',
            payload: { origin, sessionId }
          }, () => {
            this.loadHistory();
          });
        }
      });
    } else {
      this.rawItems = this.rawItems.filter(item => item.sessionId !== sessionId && item.id !== sessionId);
      this.groupSessions();
    }
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


  calculateStats() {
    const apiData: Record<string, {
      success: number;
      errors: number;
      ttft: number[];
      create: number[];
      inference: number[];
    }> = {};

    // Always initialize all available APIs so they remain in the table
    for (const api of this.availableApis) {
      apiData[api] = { success: 0, errors: 0, ttft: [], create: [], inference: [] };
    }

    for (const group of this.filteredGroups) {
      const d = apiData[group.api];
      if (!d) continue;
      
      let hasError = false;

      // Create step
      if (group.createItem) {
        if (group.createItem.timestamps?.error) {
          hasError = true;
        } else if (group.createItem.timestamps?.create && group.createItem.timestamps?.completed) {
          d.create.push(group.createItem.timestamps.completed - group.createItem.timestamps.create);
        }
      }

      // Method steps
      for (const item of group.methodItems) {
        if (item.timestamps?.error) {
          hasError = true;
        } else {
          if (item.timestamps?.execute && item.timestamps?.completed) {
            d.inference.push(item.timestamps.completed - item.timestamps.execute);
          }
          if (item.timestamps?.execute && item.timestamps?.first_token) {
            d.ttft.push(item.timestamps.first_token - item.timestamps.execute);
          }
        }
      }

      if (hasError) d.errors++;
      else d.success++;
    }

    this.stats = Object.keys(apiData).map(api => {
      const d = apiData[api];
      return {
        api,
        success: d.success,
        errors: d.errors,
        avgTtft: average(d.ttft),
        medianTtft: median(d.ttft),
        p90Ttft: calculatePercentile(d.ttft, 90),
        p95Ttft: calculatePercentile(d.ttft, 95),
        p99Ttft: calculatePercentile(d.ttft, 99),
        avgCreate: average(d.create),
        medianCreate: median(d.create),
        p90Create: calculatePercentile(d.create, 90),
        p95Create: calculatePercentile(d.create, 95),
        p99Create: calculatePercentile(d.create, 99),
        avgInference: average(d.inference),
        medianInference: median(d.inference),
        p90Inference: calculatePercentile(d.inference, 90),
        p95Inference: calculatePercentile(d.inference, 95),
        p99Inference: calculatePercentile(d.inference, 99)
      };
    });
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

      const createDataPoints: { x: string, y: number, session: string, fullSessionId: string }[] = [];
      const ttftDataPoints: { x: string, y: number, session: string, fullSessionId: string }[] = [];
      const inferenceDataPoints: { x: string, y: number, session: string, fullSessionId: string }[] = [];

      for (const group of apiGroups) {
        const x = new Date(group.timestamp).toLocaleTimeString();
        const session = group.sessionId.substring(0, 8);
        const fullSessionId = group.sessionId;

        if (group.createItem?.timestamps?.create && group.createItem?.timestamps?.completed) {
          createDataPoints.push({ x, y: group.createItem.timestamps.completed - group.createItem.timestamps.create, session, fullSessionId });
        }
        for (const item of group.methodItems) {
          if (item.timestamps?.execute && item.timestamps?.first_token) {
            ttftDataPoints.push({ x, y: item.timestamps.first_token - item.timestamps.execute, session, fullSessionId });
            break;
          }
        }
        for (const item of group.methodItems) {
          if (item.timestamps?.execute && item.timestamps?.completed) {
            inferenceDataPoints.push({ x, y: item.timestamps.completed - item.timestamps.execute, session, fullSessionId });
            break;
          }
        }
      }

      const color = this.apiColors[api] || '#ffffff';

      if (createDataPoints.length > 0) {
        datasets.push({
          label: `${api} (Create)`,
          apiName: api,
          data: createDataPoints,
          borderColor: color,
          backgroundColor: (ctx: any) => this.getPointColor(ctx, color),
          borderWidth: 2,
          borderDash: [2, 2],
          tension: 0.2,
          pointRadius: (ctx: any) => this.getPointRadius(ctx),
          pointHoverRadius: 6
        });
      }
      if (ttftDataPoints.length > 0) {
        datasets.push({
          label: `${api} (TTFT)`,
          apiName: api,
          data: ttftDataPoints,
          borderColor: color,
          backgroundColor: (ctx: any) => this.getPointColor(ctx, color),
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          pointRadius: (ctx: any) => this.getPointRadius(ctx),
          pointHoverRadius: 6
        });
      }
      if (inferenceDataPoints.length > 0) {
        datasets.push({
          label: `${api} (Inference)`,
          apiName: api,
          data: inferenceDataPoints,
          borderColor: color,
          backgroundColor: (ctx: any) => this.getPointColor(ctx, color),
          borderWidth: 2,
          tension: 0.2,
          pointRadius: (ctx: any) => this.getPointRadius(ctx),
          pointHoverRadius: 6
        });
      }
    }

    
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDark ? '#9aa0a6' : '#4b5563'; // gray-600 in light mode
    const gridColor = isDark ? '#3c4043' : '#e5e7eb'; // gray-200 in light mode

    this.chart = new Chart(ctx, {

      type: 'line',
      data: {
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        onHover: (event, elements, chart) => {
          if (event.native?.target) {
            (event.native.target as HTMLElement).style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
          if (elements && elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            const hoveredApiName = chart.data.datasets[datasetIndex] ? (chart.data.datasets[datasetIndex] as any).apiName : null;
            this.setHoveredApi(hoveredApiName);
          } else if (this.hoveredApi !== null) {
            this.setHoveredApi(null);
          }
        },
        onClick: (event, elements, chart) => {
          if (elements && elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            const dataIndex = elements[0].index;
            const dataset = chart.data.datasets[datasetIndex] as any;
            const apiName = dataset.apiName;
            const fullSessionId = dataset.data[dataIndex]?.fullSessionId;

            if (!fullSessionId) {
              console.warn('WebAI: No fullSessionId found on data point', dataset.data[dataIndex]);
              return;
            }

            this.ngZone.run(() => {
              this.expandedApi = apiName;
              this.expandedSessions.add(fullSessionId);
              this.cdr.detectChanges();
              
              setTimeout(() => {
                const rowId = `session-row-${fullSessionId}`;
                const el = document.getElementById(rowId);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Flash the row slightly to draw attention
                  el.classList.add('bg-blue-100', 'dark:bg-[#8ab4f8]/20');
                  setTimeout(() => {
                    el.classList.remove('bg-blue-100', 'dark:bg-[#8ab4f8]/20');
                  }, 1500);
                } else {
                  console.warn(`WebAI: Could not find row element with id ${rowId}`);
                }
              }, 150);
            });
          }
        },
        plugins: {
          legend: {
            display: false // We use our own legend / filters
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const session = context.raw.session;
                return `${context.dataset.label}: ${context.raw.y.toFixed(2)}ms (Session: ${session})`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Time',
              color: textColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor
            }
          },
          y: {
            title: {
              display: true,
              text: 'Execution Time (ms)',
              color: textColor
            },
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor
            },
            beginAtZero: true
          }
        }
      }
    });
  }
}
