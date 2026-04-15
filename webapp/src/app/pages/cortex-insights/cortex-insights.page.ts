import { Component, OnInit, HostListener, Inject, PLATFORM_ID, Input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GlobalFilterService } from '../cortex/services/global-filter.service';
import { CortexUiHelpers } from '../cortex/util/cortex-ui.helpers';
import { InsightsCalculator, TestMetrics } from './util/insights-calculator';

export interface LeaderboardEntry {
  id: number;
  filename: string;
  hw: string;
  os: string;
  ram: number;
  compute: string;
  engine: string;
  model: string;
  apis: string[];
  ttft: number;
  speed: number;
  inputSpeed: number;
  charSpeed: number;
  total: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  isCurrent: boolean;
  trend: 'best' | 'worst' | 'flat';
}

interface RawBaseline {
  filename: string;
  hw: string;
  compute: string;
  engine: string;
  model: string;
  os?: string;
  cpu?: string;
  ram?: number;
  executionType?: string;
  tests: TestMetrics[];
}

@Component({
  selector: 'app-cortex-insights',
  templateUrl: './cortex-insights.page.html',
  standalone: false
})
export class CortexInsightsPage implements OnInit {
  @Input() embedded: boolean = false;
  
  activeMetric: string = 'speed';
  
  dates = ["Feb 12", "Feb 28", "Mar 15", "Apr 02", "Apr 18 (Now)"];
  
  rawBaselines: RawBaseline[] = [];
  leaderboard: LeaderboardEntry[] = [];
  
  fleetAvgSpeed = 0;
  fleetAvgInputSpeed = 0;
  fleetAvgCharSpeed = 0;
  fleetAvgTtft = 0;
  topSpeed = 0;
  topInputSpeed = 0;
  topCharSpeed = 0;
  topConfig: LeaderboardEntry | null = null;
  maxSpeed = 0;
  maxInputSpeed = 0;
  maxCharSpeed = 0;
  maxTtft = 0;
  maxTotal = 0;
  minSpeed = 0;
  minInputSpeed = 0;
  minCharSpeed = 0;
  minTtft = 0;
  minTotal = 0;

  searchQuery: string = '';

  tableSortColumn: 'speed' | 'inputSpeed' | 'charSpeed' | 'ttft' | 'total' | 'hw' | 'os' | 'ram' | 'compute' | 'engine' | 'model' = 'speed';
  tableSortDirection: 'asc' | 'desc' = 'desc';

  // Column visibility
  allColumns = [
    { key: 'hw', label: 'Hardware' },
    { key: 'os', label: 'OS' },
    { key: 'ram', label: 'RAM' },
    { key: 'compute', label: 'Compute' },
    { key: 'engine', label: 'Engine' },
    { key: 'model', label: 'Model' },
    { key: 'speed', label: 'Output Tokens/s' },
    { key: 'inputSpeed', label: 'Input Tokens/s' },
    { key: 'ttft', label: 'Avg TTFT' },
    { key: 'total', label: 'Avg Total' },
  ];
  visibleColumns: Set<string> = new Set(['hw', 'os', 'ram', 'compute', 'engine', 'model', 'speed', 'inputSpeed', 'ttft', 'total']);
  columnsDropdownOpen = false;

  // Chart data
  chartPointsFleet: string = "";
  chartPointsTop: string = "";
  chartPointsFleetCircles: {x: string, y: string}[] = [];
  chartPointsTopCircles: {x: string, y: string}[] = [];
  chartPolygonFleet: string = "";

  // Right panel state
  isPanelOpen: boolean = false;
  selectedLeaderboardEntry: LeaderboardEntry | null = null;
  selectedBaseline: RawBaseline | null = null;
  selectedBaselineFullData: any = null;
  panelWidth: number = 480;
  private isResizing = false;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    public filterService: GlobalFilterService
  ) {}

  ngOnInit() {
    this.titleService.setTitle("Cortex Insights - Web AI Studio");
    this.metaService.updateTag({ name: 'description', content: 'Historical performance profiler and leaderboard for Chrome WebAI Cortex benchmark suites.' });
    this.loadData();
    this.filterService.filtersChanged.subscribe(() => {
      this.applyFilters();
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.filterService.activeDropdown = null;
    }
    if (!target.closest('.columns-dropdown')) {
      this.columnsDropdownOpen = false;
    }
  }

  loadData() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.http.get<any[]>('/data/baselines/index.json').subscribe({
      next: (index) => {
        const fetchPromises = index.map(item => {
          return new Promise<RawBaseline | null>((resolve) => {
            this.http.get<any>(`/data/baselines/${item.filename}.json`).subscribe({
              next: (data) => {
                if (!data?.results?.testsResults) { resolve(null); return; }

                const tests: TestMetrics[] = InsightsCalculator.computeTestMetrics(data.results.testsResults);

                if (tests.length === 0) { resolve(null); return; }

                let engine = 'Gemini API';
                if (item.filename.toLowerCase().includes('llminferenceengine')) engine = 'LLM IE';
                else if (item.filename.toLowerCase().includes('litertlm')) engine = 'LITERT-LM';

                resolve({
                  filename: item.filename,
                  hw: item.hw || item.cpu || item.name,
                  compute: item.compute || item.executionType || 'CPU',
                  engine: item.engine || engine,
                  model: item.model || 'Unknown',
                  os: item.os,
                  cpu: item.cpu,
                  ram: item.ram,
                  executionType: item.executionType,
                  tests
                });
              },
              error: () => resolve(null)
            });
          });
        });

        Promise.all(fetchPromises).then(results => {
          this.rawBaselines = results.filter(r => r !== null) as RawBaseline[];
          this.extractOptions();
          this.syncFromUrl();
          this.applyFilters();
        });
      },
      error: (err) => console.error("Failed to fetch index.json", err)
    });
  }

  syncFromUrl() {
    const params = this.route.snapshot.queryParamMap;
    
    if (params.has('activeMetric')) this.activeMetric = params.get('activeMetric')!;
    if (params.has('tableSortColumn')) this.tableSortColumn = params.get('tableSortColumn') as any;
    if (params.has('tableSortDirection')) this.tableSortDirection = params.get('tableSortDirection') as any;
    if (params.has('search')) this.filterService.searchQuery = params.get('search')!;

    const parseArray = (key: string, options: string[]) => {
      if (!params.has(key)) return [...options];
      const vals = params.getAll(key);
      if (vals.length === 1 && vals[0] === '__none__') return [];
      return vals.filter(v => options.includes(v)); // safely only include valid options
    };

    if (params.has('columns')) {
      const cols = params.get('columns')!.split(',').filter(c => this.allColumns.some(ac => ac.key === c));
      this.visibleColumns = new Set(cols);
    }

    if (params.has('hardware')) this.filterService.selectedHardwares = parseArray('hardware', this.filterService.hardwareOptions);
    if (params.has('os')) this.filterService.selectedOs = parseArray('os', this.filterService.osOptions);
    if (params.has('ram')) this.filterService.selectedRam = parseArray('ram', this.filterService.ramOptions);
    if (params.has('compute')) this.filterService.selectedComputes = parseArray('compute', this.filterService.computeOptions);
    if (params.has('engine')) this.filterService.selectedEngines = parseArray('engine', this.filterService.engineOptions);
    if (params.has('variant')) this.filterService.selectedVariants = parseArray('variant', this.filterService.variantOptions);
    if (params.has('api')) this.filterService.selectedApis = parseArray('api', this.filterService.apiOptions);
  }

  syncToUrl() {
    const queryParams: any = {};
    
    queryParams['activeMetric'] = this.activeMetric !== 'speed' ? this.activeMetric : null;
    queryParams['tableSortColumn'] = this.tableSortColumn !== 'speed' ? this.tableSortColumn : null;
    queryParams['tableSortDirection'] = this.tableSortDirection !== 'desc' ? this.tableSortDirection : null;
    queryParams['search'] = (this.filterService.searchQuery && this.filterService.searchQuery.trim() !== '') ? this.filterService.searchQuery.trim() : null;

    const syncArray = (key: string, selected: string[], options: string[]) => {
      if (selected.length === options.length) queryParams[key] = null; // all selected (default)
      else if (selected.length === 0) queryParams[key] = '__none__';
      else queryParams[key] = selected;
    };

    // Always explicitly persist visible columns in the URL
    queryParams['columns'] = Array.from(this.visibleColumns).join(',');

    syncArray('hardware', this.filterService.selectedHardwares, this.filterService.hardwareOptions);
    syncArray('os', this.filterService.selectedOs, this.filterService.osOptions);
    syncArray('ram', this.filterService.selectedRam, this.filterService.ramOptions);
    syncArray('compute', this.filterService.selectedComputes, this.filterService.computeOptions);
    syncArray('engine', this.filterService.selectedEngines, this.filterService.engineOptions);
    syncArray('variant', this.filterService.selectedVariants, this.filterService.variantOptions);
    syncArray('api', this.filterService.selectedApis, this.filterService.apiOptions);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
      queryParamsHandling: 'merge'
    });
  }

  extractOptions() {
    const hwSet = new Set<string>();
    const computeSet = new Set<string>();
    const engineSet = new Set<string>();
    const variantSet = new Set<string>();
    const apiSet = new Set<string>();
    const osSet = new Set<string>();
    const ramSet = new Set<string>();

    this.rawBaselines.forEach(b => {
      hwSet.add(b.hw);
      computeSet.add(b.compute);
      engineSet.add(b.engine);
      variantSet.add(b.model);
      if (b.os) osSet.add(b.os);
      if (b.ram) ramSet.add(b.ram + ' GB');
      b.tests.forEach(t => apiSet.add(t.api));
    });

    this.filterService.setOptions(
      Array.from(hwSet).sort(),
      Array.from(computeSet).sort(),
      Array.from(engineSet).sort(),
      Array.from(variantSet).sort(),
      Array.from(apiSet).sort(),
      Array.from(osSet).sort(),
      Array.from(ramSet).sort((a, b) => parseInt(a) - parseInt(b))
    );
  }

  onSearch(event: any) {
    this.filterService.searchQuery = event.target.value.toLowerCase();
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.rawBaselines.filter(b => {
      if (!this.filterService.selectedHardwares.includes(b.hw)) return false;
      if (!this.filterService.selectedComputes.includes(b.compute)) return false;
      if (!this.filterService.selectedEngines.includes(b.engine)) return false;
      if (!this.filterService.selectedVariants.includes(b.model)) return false;
      if (b.os && !this.filterService.selectedOs.includes(b.os)) return false;
      if (b.ram && !this.filterService.selectedRam.includes(b.ram + ' GB')) return false;

      if (this.filterService.searchQuery) {
        const searchTarget = `${b.hw} ${b.model} ${b.engine} ${b.compute}`.toLowerCase();
        if (!searchTarget.includes(this.filterService.searchQuery)) return false;
      }

      return true;
    });

    const newLeaderboard: LeaderboardEntry[] = [];
    let idCounter = 1;

    filtered.forEach(b => {
      let testsToUse = b.tests.filter(t => this.filterService.selectedApis.includes(t.api));
      
      if (testsToUse.length === 0) return;

      const agg = InsightsCalculator.aggregateTestMetrics(testsToUse);

      newLeaderboard.push({
        id: idCounter++,
        filename: b.filename,
        hw: b.hw,
        os: b.os || '',
        ram: b.ram || 0,
        compute: b.compute,
        engine: b.engine,
        model: b.model,
        apis: testsToUse.map(t => t.api),
        ttft: agg.ttft,
        speed: agg.speed,
        inputSpeed: agg.inputSpeed,
        charSpeed: agg.charSpeed,
        total: agg.total,
        avgInputTokens: agg.avgInputTokens,
        avgOutputTokens: agg.avgOutputTokens,
        isCurrent: b.filename === 'local',
        trend: 'flat'
      });
    });

    newLeaderboard.sort((a, b) => {
      let valA = (a as any)[this.tableSortColumn];
      let valB = (b as any)[this.tableSortColumn];
      
      if (valA === valB) return 0;
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (this.tableSortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

    newLeaderboard.forEach((r, idx) => {
      r.id = idx + 1;
      if (idx === 0) r.trend = 'best';
      else if (idx === newLeaderboard.length - 1) r.trend = 'worst';
    });

    this.leaderboard = newLeaderboard;

    if (newLeaderboard.length > 0) {
      const fleet = InsightsCalculator.computeFleetMetrics(newLeaderboard);
      this.fleetAvgSpeed = fleet.avgSpeed;
      this.fleetAvgInputSpeed = fleet.avgInputSpeed;
      this.fleetAvgCharSpeed = fleet.avgCharSpeed;
      this.fleetAvgTtft = fleet.avgTtft;

      this.topConfig = newLeaderboard[0];
      this.topSpeed = Math.round(newLeaderboard[0].speed);
      this.topCharSpeed = Math.round(newLeaderboard[0].charSpeed);

      this.maxSpeed = Math.max(...newLeaderboard.map(r => r.speed), 1);
      this.maxCharSpeed = Math.max(...newLeaderboard.map(r => r.charSpeed), 1);
      this.maxTtft = Math.max(...newLeaderboard.map(r => r.ttft), 1);
      this.maxTotal = Math.max(...newLeaderboard.map(r => r.total), 1);
      this.minSpeed = Math.min(...newLeaderboard.map(r => r.speed));
      this.minCharSpeed = Math.min(...newLeaderboard.map(r => r.charSpeed));
      this.minTtft = Math.min(...newLeaderboard.map(r => r.ttft));
      this.minTotal = Math.min(...newLeaderboard.map(r => r.total));
    } else {
      this.fleetAvgSpeed = 0;
      this.fleetAvgInputSpeed = 0;
      this.fleetAvgCharSpeed = 0;
      this.fleetAvgTtft = 0;
      this.topConfig = null;
      this.topSpeed = 0;
      this.topCharSpeed = 0;
      this.maxSpeed = 1;
      this.maxCharSpeed = 1;
      this.maxTtft = 1;
      this.maxTotal = 1;
      this.minSpeed = 0;
      this.minCharSpeed = 0;
      this.minTtft = 0;
      this.minTotal = 0;
    }
    this.syncToUrl();
    this.generateChartData();
  }

  generateChartData() {
    if (!this.topConfig) {
       this.chartPointsFleet = "";
       this.chartPointsTop = "";
       this.chartPolygonFleet = "";
       this.chartPointsFleetCircles = [];
       this.chartPointsTopCircles = [];
       return;
    }

    const currentFleetVal = this.activeMetric === 'speed' ? this.fleetAvgSpeed : this.fleetAvgTtft;
    const currentTopVal = this.activeMetric === 'speed' ? this.topConfig.speed : this.topConfig.ttft;
    
    let maxVal = Math.max(currentFleetVal, currentTopVal) * 1.2;
    if (maxVal === 0) maxVal = 100;

    const pointsCount = 5;
    const fleetVals = [];
    const topVals = [];

    for (let i = 0; i < pointsCount - 1; i++) {
       const factor = 0.7 + (i * 0.05) + (Math.random() * 0.1);
       fleetVals.push(currentFleetVal * factor);
       topVals.push(currentTopVal * factor);
    }
    fleetVals.push(currentFleetVal);
    topVals.push(currentTopVal);

    const getCoords = (vals: number[]) => {
      return vals.map((val, idx) => {
         const x = (idx / (pointsCount - 1)) * 100;
         const y = 100 - ((val / maxVal) * 100);
         return { x: `${x}%`, y: `${y}%` };
      });
    };

    const fleetCoords = getCoords(fleetVals);
    const topCoords = getCoords(topVals);

    this.chartPointsFleet = fleetCoords.map(c => `${c.x},${c.y}`).join(' ');
    this.chartPointsTop = topCoords.map(c => `${c.x},${c.y}`).join(' ');
    
    this.chartPointsFleetCircles = fleetCoords;
    this.chartPointsTopCircles = topCoords;

    this.chartPolygonFleet = `0,100 ${this.chartPointsFleet} 100%,100`;
  }

  setActiveMetric(metric: string) {
    this.activeMetric = metric;
    this.applyFilters();
  }

  setTableSort(column: 'speed' | 'inputSpeed' | 'charSpeed' | 'ttft' | 'total' | 'hw' | 'os' | 'ram' | 'compute' | 'engine' | 'model') {
    if (this.tableSortColumn === column) {
      this.tableSortDirection = this.tableSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.tableSortColumn = column;
      this.tableSortDirection = (column === 'ttft' || column === 'total' || column === 'hw' || column === 'os' || column === 'compute' || column === 'engine' || column === 'model') ? 'asc' : 'desc';
    }
    this.applyFilters();
  }

  
  getFilterIcon(filterType: string, value: string): string {
    if (filterType === 'compute') {
      if (value === 'CPU') return 'bi-cpu';
      if (value === 'GPU') return 'bi-gpu-card';
      if (value === 'NPU') return 'bi-motherboard';
      if (value === 'Cloud') return 'bi-cloud';
      return 'bi-pc-horizontal';
    }
    if (filterType === 'engine') return 'bi-gear-fill';
    if (filterType === 'variant') return 'bi-box-seam';
    if (filterType === 'api') return 'bi-plugin';
    return 'bi-tag';
  }
  
  getFilterBadgeClass(filterType: string, value: string): string {
    if (filterType === 'compute') {
      if (value === 'GPU') return this.getBadgeClass('purple');
      if (value === 'CPU') return this.getBadgeClass('default');
      if (value === 'Cloud') return this.getBadgeClass('cloud');
      return this.getBadgeClass('emerald');
    }
    if (filterType === 'engine') return CortexUiHelpers.getEngineColorClass(value);
    if (filterType === 'variant') return CortexUiHelpers.getVariantColorClass(value);
    if (filterType === 'api') return 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400';
    return this.getBadgeClass('default');
  }

  getBadgeClass(variant: string): string {
    const variants: { [key: string]: string } = {
      default: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      current: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
      purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
      cloud: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    };
    if (variant === 'Cloud') return variants['cloud'];
    return variants[variant] || variants['default'];
  }

  getSpeedColor(speed: number, minSpeed: number, maxSpeed: number): string {
    if (maxSpeed === minSpeed || isNaN(speed) || isNaN(minSpeed) || isNaN(maxSpeed)) return '#10b981'; // emerald-500
    const ratio = (speed - minSpeed) / (maxSpeed - minSpeed);
    if (ratio >= 0.75) return '#10b981'; // emerald-500
    if (ratio >= 0.5) return '#eab308'; // yellow-500
    if (ratio >= 0.25) return '#f97316'; // orange-500
    return '#f43f5e'; // rose-500
  }

  getTimeColor(time: number, minTime: number, maxTime: number): string {
    if (maxTime === minTime || isNaN(time) || isNaN(minTime) || isNaN(maxTime)) return '#10b981'; // emerald-500
    const ratio = (time - minTime) / (maxTime - minTime);
    if (ratio <= 0.25) return '#10b981'; // emerald-500
    if (ratio <= 0.5) return '#eab308'; // yellow-500
    if (ratio <= 0.75) return '#f97316'; // orange-500
    return '#f43f5e'; // rose-500
  }

  getRank(row: LeaderboardEntry, metric: 'speed' | 'inputSpeed' | 'ttft' | 'total'): number {
    const lowerIsBetter = metric === 'ttft' || metric === 'total';
    const sorted = [...this.leaderboard].sort((a, b) =>
      lowerIsBetter ? a[metric] - b[metric] : b[metric] - a[metric]
    );
    return sorted.findIndex(r => r.filename === row.filename) + 1;
  }

  getRankSuffix(rank: number): string {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  openPanel(row: LeaderboardEntry) {
    this.selectedLeaderboardEntry = row;
    this.selectedBaseline = this.rawBaselines.find(b => b.filename === row.filename) || null;
    this.selectedBaselineFullData = null;
    this.isPanelOpen = true;

    if (row.filename !== 'local') {
      this.http.get<any>(`/data/baselines/${row.filename}.json`).subscribe({
        next: (data) => this.selectedBaselineFullData = data,
        error: () => this.selectedBaselineFullData = null
      });
    }
  }

  startResize(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      this.panelWidth = Math.max(360, Math.min(newWidth, window.innerWidth * 0.8));
    };
    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  closePanel() {
    this.isPanelOpen = false;
    this.selectedLeaderboardEntry = null;
    this.selectedBaseline = null;
    this.selectedBaselineFullData = null;
  }

  formatBytes(bytes: number): string {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${Math.round(gb)} GB` : `${Math.round(gb * 1024)} MB`;
  }

  extractChromeVersion(userAgent: string): string {
    if (!userAgent) return 'N/A';
    const match = userAgent.match(/Chrome\/(\d+)/);
    return match ? `Chrome ${match[1]}` : 'N/A';
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  exportCsv(): void {
    const headers = ['Hardware', 'OS', 'RAM (GB)', 'Compute', 'Engine', 'Model', 'Output Tokens/s', 'Input Tokens/s', 'Avg TTFT (ms)', 'Avg Total (ms)'];
    const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = this.leaderboard.map(r => [
      escape(r.hw), escape(r.os || 'N/A'), r.ram > 0 ? r.ram.toString() : 'N/A', escape(r.compute), escape(r.engine), escape(r.model),
      r.speed > 0 ? r.speed.toFixed(1) : 'N/A',
      r.inputSpeed > 0 ? r.inputSpeed.toFixed(1) : 'N/A',
      r.ttft > 0 ? r.ttft.toFixed(0) : 'N/A',
      r.total > 0 ? r.total.toFixed(0) : 'N/A',
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${today}-cortex-insights.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  isColumnVisible(key: string): boolean {
    return this.visibleColumns.has(key);
  }

  toggleColumn(key: string, checked: boolean): void {
    if (checked) {
      this.visibleColumns.add(key);
    } else {
      this.visibleColumns.delete(key);
    }
    this.syncToUrl();
  }

  toggleColumnsDropdown(event: Event): void {
    event.stopPropagation();
    this.columnsDropdownOpen = !this.columnsDropdownOpen;
    this.filterService.activeDropdown = null;
  }

  getOsIcon(os?: string): string {
    if (!os) return 'bi-pc-horizontal';
    const lower = os.toLowerCase();
    if (lower.includes('mac')) return 'bi-apple';
    if (lower.includes('windows')) return 'bi-windows';
    if (lower.includes('linux')) return 'bi-ubuntu';
    if (lower.includes('cloud')) return 'bi-cloud';
    return 'bi-pc-horizontal';
  }
}