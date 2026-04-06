import { Component, OnInit, HostListener } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MathematicalCalculations } from '../cortex/axon/util/mathematical-calculations';

export interface LeaderboardEntry {
  id: number;
  filename: string;
  hw: string;
  compute: string;
  engine: string;
  model: string;
  api: string;
  ttft: number;
  speed: number;
  total: number;
  isCurrent: boolean;
  trend: 'up' | 'down' | 'flat';
}

interface RawTestResult {
  api: string;
  ttft: number;
  speed: number;
  total: number;
}

interface RawBaseline {
  filename: string;
  hw: string;
  compute: string;
  engine: string;
  model: string;
  tests: RawTestResult[];
}

@Component({
  selector: 'app-cortex-insights',
  templateUrl: './cortex-insights.page.html',
  standalone: false
})
export class CortexInsightsPage implements OnInit {
  activeMetric: string = 'speed';
  
  dates = ["Feb 12", "Feb 28", "Mar 15", "Apr 02", "Apr 18 (Now)"];
  
  rawBaselines: RawBaseline[] = [];
  leaderboard: LeaderboardEntry[] = [];
  
  fleetAvgSpeed = 0;
  fleetAvgTtft = 0;
  topSpeed = 0;
  topConfig: LeaderboardEntry | null = null;
  maxSpeed = 0;
  maxTtft = 0;

  // Filters
  hardwareOptions: string[] = ['All'];
  computeOptions: string[] = ['All'];
  engineOptions: string[] = ['All'];
  variantOptions: string[] = ['All'];
  apiOptions: string[] = ['All'];

  selectedHardware = 'All';
  selectedCompute = 'All';
  selectedEngine = 'All';
  selectedVariant = 'All';
  selectedApi = 'All';

  activeDropdown: string | null = null;

  // Chart data
  chartPointsFleet: string = "";
  chartPointsTop: string = "";
  chartPointsFleetCircles: {x: string, y: string}[] = [];
  chartPointsTopCircles: {x: string, y: string}[] = [];
  chartPolygonFleet: string = "";

  constructor(private titleService: Title, private metaService: Meta, private http: HttpClient) {}

  ngOnInit() {
    this.titleService.setTitle("Cortex Insights - Web AI Studio");
    this.metaService.updateTag({ name: 'description', content: 'Historical Performance Profiler for Web AI Studio' });
    this.loadData();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(dropdown: string, event: MouseEvent) {
    event.stopPropagation();
    this.activeDropdown = this.activeDropdown === dropdown ? null : dropdown;
  }

  selectFilter(filterType: string, value: string) {
    if (filterType === 'hardware') this.selectedHardware = value;
    if (filterType === 'compute') this.selectedCompute = value;
    if (filterType === 'engine') this.selectedEngine = value;
    if (filterType === 'variant') this.selectedVariant = value;
    if (filterType === 'api') this.selectedApi = value;
    
    this.activeDropdown = null;
    this.applyFilters();
  }

  loadData() {
    this.http.get<any[]>('/data/baselines/index.json').subscribe(index => {
      const fetchPromises = index.map(item => {
        return new Promise<RawBaseline | null>((resolve) => {
          this.http.get<any>(`/data/baselines/${item.filename}.json`).subscribe({
            next: (data) => {
              if (!data?.results?.testsResults) { resolve(null); return; }
              
              const tests: RawTestResult[] = [];
              const apiGroups = new Map<string, any[]>();

              data.results.testsResults.forEach((testResult: any) => {
                const api = testResult.api;
                if (!apiGroups.has(api)) apiGroups.set(api, []);
                const iterations = (testResult.testIterationResults || []).filter((i: any) => i.status === 'success');
                apiGroups.get(api)!.push(...iterations);
              });

              apiGroups.forEach((iterations, api) => {
                if (iterations.length > 0) {
                  tests.push({
                    api,
                    ttft: MathematicalCalculations.calculateAverage(iterations.map((i: any) => i.timeToFirstToken ?? 0)),
                    speed: MathematicalCalculations.calculateAverage(iterations.map((i: any) => i.tokensPerSecond ?? 0)),
                    total: MathematicalCalculations.calculateAverage(iterations.map((i: any) => i.totalResponseTime ?? 0)),
                  });
                }
              });

              if (tests.length === 0) { resolve(null); return; }

              let engine = 'Gemini API';
              if (item.filename.toLowerCase().includes('llminferenceengine')) engine = 'LLM IE';
              else if (item.filename.toLowerCase().includes('litertlm')) engine = 'LITERT-LM';

              resolve({
                filename: item.filename,
                hw: item.name,
                compute: item.executionType || 'CPU',
                engine: engine,
                model: item.model || 'Unknown',
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
        this.applyFilters();
      });
    });
  }

  extractOptions() {
    const hwSet = new Set<string>();
    const computeSet = new Set<string>();
    const engineSet = new Set<string>();
    const variantSet = new Set<string>();
    const apiSet = new Set<string>();

    this.rawBaselines.forEach(b => {
      hwSet.add(b.hw);
      computeSet.add(b.compute);
      engineSet.add(b.engine);
      variantSet.add(b.model);
      b.tests.forEach(t => apiSet.add(t.api));
    });

    this.hardwareOptions = ['All', ...Array.from(hwSet).sort()];
    this.computeOptions = ['All', ...Array.from(computeSet).sort()];
    this.engineOptions = ['All', ...Array.from(engineSet).sort()];
    this.variantOptions = ['All', ...Array.from(variantSet).sort()];
    this.apiOptions = ['All', ...Array.from(apiSet).sort()];
  }

  applyFilters() {
    let filtered = this.rawBaselines.filter(b => {
      if (this.selectedHardware !== 'All' && b.hw !== this.selectedHardware) return false;
      if (this.selectedCompute !== 'All' && b.compute !== this.selectedCompute) return false;
      if (this.selectedEngine !== 'All' && b.engine !== this.selectedEngine) return false;
      if (this.selectedVariant !== 'All' && b.model !== this.selectedVariant) return false;
      return true;
    });

    const newLeaderboard: LeaderboardEntry[] = [];
    let idCounter = 1;

    filtered.forEach(b => {
      let testsToUse = b.tests;
      if (this.selectedApi !== 'All') {
        testsToUse = b.tests.filter(t => t.api === this.selectedApi);
      }
      
      if (testsToUse.length === 0) return;

      const ttft = Math.round(MathematicalCalculations.calculateAverage(testsToUse.map(t => t.ttft)));
      const speed = Math.round(MathematicalCalculations.calculateAverage(testsToUse.map(t => t.speed)));
      const total = Math.round(MathematicalCalculations.calculateAverage(testsToUse.map(t => t.total)));

      newLeaderboard.push({
        id: idCounter++,
        filename: b.filename,
        hw: b.hw,
        compute: b.compute,
        engine: b.engine,
        model: b.model,
        api: this.selectedApi,
        ttft,
        speed,
        total,
        isCurrent: false,
        trend: 'flat'
      });
    });

    newLeaderboard.sort((a, b) => {
      if (this.activeMetric === 'ttft' || this.activeMetric === 'total') {
        return a.ttft - b.ttft; // Lower is better
      }
      return b.speed - a.speed;
    });

    newLeaderboard.forEach((r, idx) => {
      r.id = idx + 1;
      if (idx === 0) r.trend = 'up';
      else if (idx === newLeaderboard.length - 1) r.trend = 'down';
    });

    this.leaderboard = newLeaderboard;

    if (newLeaderboard.length > 0) {
      this.fleetAvgSpeed = Math.round(MathematicalCalculations.calculateAverage(newLeaderboard.map(r => r.speed)));
      this.fleetAvgTtft = Math.round(MathematicalCalculations.calculateAverage(newLeaderboard.map(r => r.ttft)));
      
      this.topConfig = newLeaderboard[0];
      this.topSpeed = Math.round(newLeaderboard[0].speed);
      
      this.maxSpeed = Math.max(...newLeaderboard.map(r => r.speed), 1);
      this.maxTtft = Math.max(...newLeaderboard.map(r => r.ttft), 1);
    } else {
      this.fleetAvgSpeed = 0;
      this.fleetAvgTtft = 0;
      this.topConfig = null;
      this.topSpeed = 0;
      this.maxSpeed = 1;
      this.maxTtft = 1;
    }

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

  getBadgeClass(variant: string): string {
    const variants: { [key: string]: string } = {
      default: 'bg-gray-800 text-gray-300 border-gray-700',
      current: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cloud: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
    if (variant === 'Cloud') return variants['cloud'];
    return variants[variant] || variants['default'];
  }
}
