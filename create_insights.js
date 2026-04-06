const fs = require('fs');
const path = require('path');

const dir = 'webapp/src/app/pages/cortex-insights';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const tsContent = `import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-cortex-insights',
  templateUrl: './cortex-insights.page.html',
  standalone: false
})
export class CortexInsightsPage implements OnInit {
  activeMetric: string = 'speed';
  
  dates = ["Feb 12", "Feb 28", "Mar 15", "Apr 02", "Apr 18 (Now)"];
  
  leaderboard = [
    { id: 1, hw: "Apple M4", compute: "GPU", engine: "LLM IE", model: "NANO V3 4K", ttft: 210, speed: 6566, total: 1200, isCurrent: false, trend: 'up' },
    { id: 2, hw: "Apple M3 Ultra", compute: "GPU", engine: "LLM IE", model: "NANO V3 4K", ttft: 235, speed: 6006, total: 1350, isCurrent: false, trend: 'up' },
    { id: 3, hw: "Apple M2 Max", compute: "GPU", engine: "LLM IE", model: "NANO V3 4K", ttft: 264, speed: 4864, total: 1486, isCurrent: true, trend: 'flat' },
    { id: 4, hw: "Apple M4", compute: "CPU", engine: "LITERT-LM", model: "NANO V3 4K", ttft: 310, speed: 4454, total: 1700, isCurrent: false, trend: 'up' },
    { id: 5, hw: "Apple M3 Ultra", compute: "GPU", engine: "LITERT-LM", model: "NANO V3 2K", ttft: 280, speed: 4462, total: 1650, isCurrent: false, trend: 'down' },
    { id: 6, hw: "Apple M1 Max", compute: "CPU", engine: "LLM IE", model: "NANO V3 4K", ttft: 405, speed: 4063, total: 2100, isCurrent: false, trend: 'up' },
    { id: 7, hw: "Apple M1 Max", compute: "CPU", engine: "LITERT-LM", model: "NANO V3 4K", ttft: 450, speed: 3093, total: 2600, isCurrent: false, trend: 'flat' },
  ];

  constructor(private titleService: Title, private metaService: Meta) {}

  ngOnInit() {
    this.titleService.setTitle("Cortex Insights - Web AI Studio");
    this.metaService.updateTag({ name: 'description', content: 'Historical Performance Profiler for Web AI Studio' });
  }

  setActiveMetric(metric: string) {
    this.activeMetric = metric;
  }

  getBadgeClass(variant: string): string {
    const variants: { [key: string]: string } = {
      default: 'bg-gray-800 text-gray-300 border-gray-700',
      current: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return variants[variant] || variants['default'];
  }
}
`;

const htmlContent = \`<div class="min-h-screen bg-gray-950 font-sans text-gray-200 selection:bg-indigo-500/30 selection:text-indigo-200 pb-32">
  
  <!-- HEADER -->
  <header class="border-b border-gray-800 px-6 py-4 sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl">
    <div class="max-w-[1600px] mx-auto flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <i class="bi bi-activity text-white text-lg"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold text-white tracking-tight leading-tight">Cortex Insights</h1>
          <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Historical Performance Profiler</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-bold text-gray-300 rounded-lg transition-all">
          <i class="bi bi-file-earmark-text text-gray-400"></i> Export Report
        </button>
        <button class="flex items-center gap-2 px-4 py-1.5 bg-indigo-500 text-white hover:bg-indigo-400 text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]" routerLink="/cortex">
          <i class="bi bi-play-fill fill-current"></i> Run Suite
        </button>
      </div>
    </div>
  </header>

  <!-- SMART FILTER BAR -->
  <div class="border-b border-gray-800 bg-gray-900/50">
    <div class="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
      <div class="flex items-center gap-3 shrink-0">
        <i class="bi bi-funnel text-gray-500"></i>
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filters</span>
        <div class="w-px h-4 bg-gray-800 mx-1"></div>
        
        <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
          <span class="opacity-60">Hardware:</span>
          <span class="text-gray-200">All Models</span>
          <i class="bi bi-chevron-down opacity-50 ml-1"></i>
        </button>
        
        <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
          <span class="opacity-60">Compute:</span>
          <span class="text-gray-200">All (CPU/GPU)</span>
          <i class="bi bi-chevron-down opacity-50 ml-1"></i>
        </button>

        <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
          <span class="opacity-60">Engine:</span>
          <span class="text-indigo-300">LLM IE</span>
          <i class="bi bi-chevron-down opacity-50 ml-1"></i>
        </button>

        <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
          <span class="opacity-60">Variant:</span>
          <span class="text-indigo-300">NANO V3</span>
          <i class="bi bi-chevron-down opacity-50 ml-1"></i>
        </button>

        <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
          <span class="opacity-60">API:</span>
          <span class="text-indigo-300">Summarizer</span>
          <i class="bi bi-chevron-down opacity-50 ml-1"></i>
        </button>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
          <i class="bi bi-calendar"></i> Date Range: <span class="text-gray-300">Last 5 Commits</span>
        </div>
      </div>
    </div>
  </div>

  <main class="max-w-[1600px] mx-auto px-6 py-8 flex flex-col gap-6">
    
    <!-- TOP ROW: KPIs & Hero Chart -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      <!-- KPI Column -->
      <div class="flex flex-col gap-4">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div class="flex items-center gap-2 text-gray-400 mb-3 relative z-10">
            <i class="bi bi-speedometer2"></i> <span class="text-[10px] font-bold uppercase tracking-widest">Fleet Avg Speed</span>
          </div>
          <div class="flex items-baseline gap-1 relative z-10">
            <span class="text-3xl font-bold text-white tracking-tight">4,820</span>
            <span class="text-xs font-semibold text-gray-500">c/s</span>
          </div>
          <div class="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 relative z-10">
            <i class="bi bi-graph-up-arrow"></i> +12% vs previous
          </div>
        </div>

        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div class="flex items-center gap-2 text-gray-400 mb-3 relative z-10">
            <i class="bi bi-stopwatch"></i> <span class="text-[10px] font-bold uppercase tracking-widest">Fleet Avg TTFT</span>
          </div>
          <div class="flex items-baseline gap-1 relative z-10">
            <span class="text-3xl font-bold text-white tracking-tight">285</span>
            <span class="text-xs font-semibold text-gray-500">ms</span>
          </div>
          <div class="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 relative z-10">
            <i class="bi bi-graph-down-arrow"></i> -8% vs previous
          </div>
        </div>

        <div class="bg-indigo-500/5 border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.1)] flex flex-col justify-center">
           <h3 class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
             <i class="bi bi-trophy"></i> Top Configuration
           </h3>
           <div class="text-base font-bold text-white mt-1 leading-tight">Apple M4 (GPU)</div>
           <div class="text-xs font-medium text-indigo-200/70 mt-1">LLM IE &bull; NANO V3 4K</div>
           <div class="mt-3 pt-3 border-t border-indigo-500/20 flex justify-between items-center">
             <span class="text-[10px] font-bold text-gray-400 uppercase">Peak Speed</span>
             <span class="text-sm font-bold text-emerald-400">6,566 c/s</span>
           </div>
        </div>
      </div>

      <!-- Hero Chart Column -->
      <div class="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6 flex flex-col relative overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <i class="bi bi-activity text-indigo-400"></i> Performance Evolution
            </h2>
            <p class="text-[11px] font-medium text-gray-500 mt-1">Tracking Fleet Average vs. Top Performer over selected date range.</p>
          </div>
          <div class="flex items-center gap-2 bg-gray-950 rounded-lg p-1 border border-gray-800">
            <button 
              (click)="setActiveMetric('speed')"
              class="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors"
              [class]="activeMetric === 'speed' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'"
            >Speed (c/s)</button>
            <button 
              (click)="setActiveMetric('ttft')"
              class="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors"
              [class]="activeMetric === 'ttft' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'"
            >TTFT (ms)</button>
          </div>
        </div>

        <!-- Simulated Hero Chart -->
        <div class="flex-1 relative min-h-[250px] w-full mt-4">
          <!-- Y-Axis Labels -->
          <div class="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] font-bold text-gray-600 w-10 text-right pr-3">
            @if (activeMetric === 'speed') {
              <span>7k</span><span>5k</span><span>3k</span><span>1k</span>
            } @else {
              <span>600</span><span>400</span><span>200</span><span>0</span>
            }
          </div>
          
          <!-- Grid Lines -->
          <div class="absolute left-10 right-0 top-2 bottom-8 flex flex-col justify-between">
            @for (i of [1,2,3,4]; track i) {
              <div class="w-full border-t border-gray-800/60 border-dashed"></div>
            }
          </div>

          <!-- X-Axis Labels -->
          <div class="absolute left-10 right-0 bottom-0 flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4">
            @for (d of dates; track d; let idx = $index; let last = $last) {
              <span [class.text-indigo-400]="last">{{d}}</span>
            }
          </div>

          <!-- Chart SVG -->
          <svg class="absolute left-10 right-0 top-2 bottom-8 w-[calc(100%-2.5rem)] h-[calc(100%-2rem)] overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.2" />
                <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
              </linearGradient>
            </defs>
            
            @if (activeMetric === 'speed') {
              <!-- Top Performer Line (Emerald) -->
              <polyline points="0,30 25%,20 50%,15 75%,10 100%,5" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="100%" cy="5" r="4" fill="#0B0F19" stroke="#10b981" stroke-width="2" />
              
              <!-- Fleet Avg Line (Purple Gradient) -->
              <polygon points="0,100 0,60 25%,50 50%,40 75%,35 100%,30 100%,100" fill="url(#gradient)" />
              <polyline points="0,60 25%,50 50%,40 75%,35 100%,30" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="100%" cy="30" r="4" fill="#0B0F19" stroke="#8b5cf6" stroke-width="2.5" />
            } @else {
               <!-- TTFT implies lower is better -->
              <polyline points="0,80 25%,85 50%,90 75%,92 100%,95" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="100%" cy="95" r="4" fill="#0B0F19" stroke="#10b981" stroke-width="2" />
              
              <polyline points="0,30 25%,40 50%,55 75%,65 100%,70" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="100%" cy="70" r="4" fill="#0B0F19" stroke="#8b5cf6" stroke-width="2.5" />
            }
          </svg>

          <!-- Chart Legend -->
          <div class="absolute top-0 right-4 flex items-center gap-4 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-800">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-1 bg-purple-500 rounded-full"></div>
              <span class="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Fleet Avg</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-1 bg-emerald-500 rounded-full"></div>
              <span class="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Top Config</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM ROW: The Leaderboard Matrix -->
    <div class="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
      
      <!-- Table Header Controls -->
      <div class="px-6 py-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-950/30">
        <div class="flex items-center gap-3">
          <i class="bi bi-hdd-network text-indigo-400 text-xl"></i>
          <h2 class="text-lg font-bold text-white tracking-tight">Configuration Leaderboard</h2>
          <span class="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-[10px] font-bold ml-2">Showing {{ leaderboard.length }} Configs</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
            <input 
              type="text" 
              placeholder="Search hardware or model..." 
              class="w-64 bg-gray-900 border border-gray-800 text-sm text-white rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-600"
            />
          </div>
          <button class="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-lg transition-all">
             <i class="bi bi-sliders"></i> View Options
          </button>
        </div>
      </div>

      <!-- The Data Matrix -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr class="bg-gray-900/80 border-b border-gray-800">
              <th class="px-6 py-3 w-16 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Rank</th>
              <th class="px-4 py-3 w-80 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hardware & Config</th>
              <th class="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right pr-8">Avg Speed <span class="opacity-50 lowercase">(c/s)</span></th>
              <th class="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right pr-8">Avg TTFT <span class="opacity-50 lowercase">(ms)</span></th>
              <th class="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right pr-8">Avg Total <span class="opacity-50 lowercase">(ms)</span></th>
              <th class="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/50">
            @for (row of leaderboard; track row.id; let idx = $index) {
              @let maxSpeed = 7000;
              @let speedWidth = (row.speed / maxSpeed) * 100;
              @let isCurrent = row.isCurrent;

              <tr class="group transition-colors" [ngClass]="isCurrent ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-gray-800/30'">
                <!-- Rank -->
                <td class="px-6 py-4 text-center align-middle">
                  <div class="w-6 h-6 mx-auto rounded flex items-center justify-center text-xs font-bold"
                       [ngClass]="idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                                  idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-400/30' : 
                                  idx === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                                  'text-gray-500'">
                    {{ idx + 1 }}
                  </div>
                </td>

                <!-- Hardware Config -->
                <td class="px-4 py-4 align-middle">
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold tracking-tight" [ngClass]="isCurrent ? 'text-indigo-400' : 'text-gray-200'">
                        {{ row.hw }}
                      </span>
                      @if (isCurrent) {
                        <span class="px-1.5 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-widest">You</span>
                      }
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border" [ngClass]="getBadgeClass(row.compute === 'GPU' ? 'purple' : 'default')">{{ row.compute }}</span>
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border" [ngClass]="getBadgeClass('default')">{{ row.engine }}</span>
                      <span class="text-[10px] font-semibold text-gray-500 ml-1">{{ row.model }}</span>
                    </div>
                  </div>
                </td>

                <!-- Speed Cell (with Sparkline) -->
                <td class="px-4 py-4 align-middle pr-8">
                  <div class="flex flex-col items-end gap-1.5">
                    <div class="flex items-center gap-2">
                      @if (row.trend === 'up') { <i class="bi bi-graph-up-arrow text-emerald-400 text-xs"></i> }
                      @if (row.trend === 'down') { <i class="bi bi-graph-down-arrow text-rose-400 text-xs"></i> }
                      <span class="text-sm font-bold tabular-nums" [ngClass]="idx === 0 ? 'text-emerald-400' : 'text-gray-200'">
                        {{ row.speed | number:'1.0-0' }}
                      </span>
                    </div>
                    <div class="w-32 h-1 bg-gray-800 rounded-full overflow-hidden flex justify-end">
                      <div class="h-full bg-emerald-500 rounded-full" [style.width]="speedWidth + '%'"></div>
                    </div>
                  </div>
                </td>

                <!-- TTFT Cell -->
                <td class="px-4 py-4 align-middle text-right pr-8">
                   <span class="text-sm font-bold text-gray-300 tabular-nums">{{ row.ttft }}</span>
                </td>

                <!-- Total Time Cell -->
                <td class="px-4 py-4 align-middle text-right pr-8">
                   <span class="text-sm font-bold text-gray-300 tabular-nums">{{ row.total | number:'1.0-0' }}</span>
                </td>

                <!-- Action -->
                <td class="px-4 py-4 align-middle text-center">
                  <button class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors mx-auto">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

  </main>
</div>\`;

fs.writeFileSync(path.join(dir, 'cortex-insights.page.ts'), tsContent);
fs.writeFileSync(path.join(dir, 'cortex-insights.page.html'), htmlContent);
console.log('Files created');
