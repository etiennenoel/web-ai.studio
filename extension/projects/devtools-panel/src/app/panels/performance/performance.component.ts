import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
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
  timeFilteredGroups: SessionGroup[] = [];
  
  timeFilter: '5m' | '1h' | '24h' | 'all' = 'all';
  availableApis: string[] = ['LanguageModel', 'Summarizer', 'Translator', 'LanguageDetector', 'Writer', 'Rewriter', 'Proofreader'];
  selectedApis: Set<string> = new Set<string>(['LanguageModel', 'Summarizer', 'Translator', 'LanguageDetector', 'Writer', 'Rewriter', 'Proofreader']);
  
  hoveredApi: string | null = null;
  
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

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadHistory();
  }

  ngAfterViewInit() {
    if (this.timeFilteredGroups.length > 0) {
      this.updateChart();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
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
    }

    this.sessionGroups = Array.from(groupsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
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
    
    this.timeFilteredGroups = this.sessionGroups.filter(group => {
      return this.timeFilter === 'all' || group.timestamp >= timeLimit;
    });

    this.calculateStats();
    setTimeout(() => {
      if (this.performanceChartRef) {
        this.updateChart();
      }
    }, 0);
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
      return filter === 'all' || group.timestamp >= timeLimit;
    }).length;
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

    for (const group of this.timeFilteredGroups) {
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
      const apiGroups = this.timeFilteredGroups.filter(g => g.api === api);
      if (apiGroups.length === 0) continue;

      const createDataPoints: { x: string, y: number, session: string }[] = [];
      const ttftDataPoints: { x: string, y: number, session: string }[] = [];
      const inferenceDataPoints: { x: string, y: number, session: string }[] = [];

      for (const group of apiGroups) {
        const x = new Date(group.timestamp).toLocaleTimeString();
        const session = group.sessionId.substring(0, 8);

        if (group.createItem?.timestamps?.create && group.createItem?.timestamps?.completed) {
          createDataPoints.push({ x, y: group.createItem.timestamps.completed - group.createItem.timestamps.create, session });
        }
        for (const item of group.methodItems) {
          if (item.timestamps?.execute && item.timestamps?.first_token) {
            ttftDataPoints.push({ x, y: item.timestamps.first_token - item.timestamps.execute, session });
            break;
          }
        }
        for (const item of group.methodItems) {
          if (item.timestamps?.execute && item.timestamps?.completed) {
            inferenceDataPoints.push({ x, y: item.timestamps.completed - item.timestamps.execute, session });
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
          backgroundColor: color,
          borderWidth: 2,
          borderDash: [2, 2],
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6
        });
      }
      if (ttftDataPoints.length > 0) {
        datasets.push({
          label: `${api} (TTFT)`,
          apiName: api,
          data: ttftDataPoints,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6
        });
      }
      if (inferenceDataPoints.length > 0) {
        datasets.push({
          label: `${api} (Inference)`,
          apiName: api,
          data: inferenceDataPoints,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6
        });
      }
    }

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
          intersect: true,
        },
        onHover: (event, elements, chart) => {
          if (elements && elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            const hoveredApiName = chart.data.datasets[datasetIndex] ? (chart.data.datasets[datasetIndex] as any).apiName : null;
            this.setHoveredApi(hoveredApiName);
          } else if (this.hoveredApi !== null) {
            this.setHoveredApi(null);
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
              color: '#9aa0a6'
            },
            ticks: {
              color: '#9aa0a6'
            },
            grid: {
              color: '#3c4043'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Execution Time (ms)',
              color: '#9aa0a6'
            },
            ticks: {
              color: '#9aa0a6'
            },
            grid: {
              color: '#3c4043'
            },
            beginAtZero: true
          }
        }
      }
    });
  }
}
