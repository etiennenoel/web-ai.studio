import {Injectable, Inject, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AxonSummaryResultsInterface} from '../axon/interfaces/axon-summary-results.interface';
import {MathematicalCalculations} from '../axon/util/mathematical-calculations';
import {TestStatus} from '../../../enums/test-status.enum';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ComparisonDataService {

  baselines: { id: string, name: string, data: any }[] = [];
  availableBaselinesIndex: {filename: string, name: string, os?: string, cpu?: string, ram?: number, model?: string, executionType?: 'CPU' | 'GPU' | 'NPU' | 'Cloud'}[] = [];

  private readonly LOCAL_STORAGE_KEY = 'cortex_selected_baselines';
  private intendedSelections: Map<string, string> = new Map<string, string>();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const savedBaselines = this.getSavedBaselines();
      if (savedBaselines) {
        savedBaselines.forEach(b => {
          this.intendedSelections.set(b.id, b.name);
          this.fetchBaseline(b.id, b.name);
        });
        this.loadAvailableBaselinesIndex();
      } else {
        this.addBaseline('2026-04-03_gemini_3.1_flash', 'Cloud Gemini 3.1 Flash', false);
        this.addBaseline('2026-04-03_gemini_3.1_flash_lite', 'Cloud Gemini 3.1 Flash Lite', false);
        this.loadAvailableBaselinesIndex();
      }
    }
  }

  private getSavedBaselines(): {id: string, name: string}[] | null {
      if (!isPlatformBrowser(this.platformId)) return null;
      const saved = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) {
              return null;
          }
      }
      return null;
  }

  private saveBaselines(baselinesToSave: {id: string, name: string}[]) {
      if (!isPlatformBrowser(this.platformId)) return;
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(baselinesToSave));
  }

  loadAvailableBaselinesIndex(hardwareInfo?: any) {
    this.http.get<{filename: string, name: string, os?: string, cpu?: string, ram?: number, model?: string, executionType?: 'CPU' | 'GPU' | 'NPU' | 'Cloud'}[]>('/data/baselines/index.json').subscribe({
        next: (data) => {
            this.availableBaselinesIndex = data;
            if (hardwareInfo && !this.getSavedBaselines()) {
              this.matchAndLoadBaseline(hardwareInfo);
            }
        },
        error: (err) => {
            console.warn('Failed to load baselines index');
        }
    });
  }

  addBaseline(filename: string, name: string, saveToStorage: boolean = true) {
      if (!isPlatformBrowser(this.platformId)) return;

      this.intendedSelections.set(filename, name);

      if (saveToStorage) {
          let saved = this.getSavedBaselines();
          if (!saved) {
              saved = Array.from(this.intendedSelections.entries()).map(([id, baselineName]) => ({id, name: baselineName}));
          }
          if (!saved.some(b => b.id === filename)) {
              saved.push({ id: filename, name: name });
          }
          this.saveBaselines(saved);
      }

      this.fetchBaseline(filename, name);
  }

  private fetchBaseline(filename: string, name: string) {
      if (this.baselines.some(b => b.id === filename)) return;

      this.http.get(`/data/baselines/${filename}.json`).subscribe({
          next: (data) => {
              if (this.intendedSelections.has(filename)) {
                  if (!this.baselines.some(b => b.id === filename)) {
                      this.baselines.push({ id: filename, name: name, data: data });
                      this.baselines.sort((a, b) => a.name.localeCompare(b.name));
                  }
              }
          },
          error: (err) => {
              console.error(`Failed to load baseline ${filename}`);
          }
      });
  }

  removeBaseline(id: string, saveToStorage: boolean = true) {
      if (!isPlatformBrowser(this.platformId)) return;

      this.intendedSelections.delete(id);

      if (saveToStorage) {
          let saved = this.getSavedBaselines();
          if (!saved) {
              saved = Array.from(this.intendedSelections.entries()).map(([baselineId, name]) => ({id: baselineId, name}));
          } else {
              saved = saved.filter(b => b.id !== id);
          }
          this.saveBaselines(saved);
      }

      this.baselines = this.baselines.filter(b => b.id !== id);
  }

  loadBaselineData(hardwareInfo: any) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.getSavedBaselines()) {
      return;
    }

    if (this.availableBaselinesIndex.length === 0) {
      this.loadAvailableBaselinesIndex(hardwareInfo);
    } else {
      this.matchAndLoadBaseline(hardwareInfo);
    }
  }

  private matchAndLoadBaseline(hardwareInfo: any) {
    if (!hardwareInfo?.cpu?.modelName) {
      this.addBaseline('2026-04-05-Apple-M4-Max-64gb-litertlm', 'Apple M4 Max (LiteRT)', false); // Fallback
      return;
    }
    
    const userCpu = hardwareInfo.cpu.modelName.toLowerCase();
    let userRam = 0;
    if (hardwareInfo?.memory?.capacity) {
      userRam = Math.round(hardwareInfo.memory.capacity / (1024 * 1024 * 1024));
    }

    let bestMatch = null;
    let bestScore = -1;

    for (const baseline of this.availableBaselinesIndex) {
      if (baseline.os === 'Cloud') continue;
      
      let score = 0;
      if (baseline.cpu && userCpu.includes(baseline.cpu.toLowerCase())) {
        score += 100;
      }
      
      if (baseline.ram) {
        // Closer RAM gives higher score (max 50 points if exact match)
        const diff = Math.abs(baseline.ram - userRam);
        score += Math.max(0, 50 - diff);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = baseline;
      }
    }

    if (bestMatch && bestScore > 0) {
      this.addBaseline(bestMatch.filename, bestMatch.name, false);
    } else {
      this.addBaseline('2026-04-05-Apple-M4-Max-64gb-litertlm', 'Apple M4 Max (LiteRT)', false); // Fallback
    }
  }

  getSummaryResults(reportData: any, builtInAIApi: string | number, selectedTestIds: Set<string>): AxonSummaryResultsInterface | undefined {
    if (!reportData || !reportData.results || !reportData.results.testsResults || !selectedTestIds) return undefined;

    const results = reportData.results.testsResults;
    const items = results.filter((value: any) => {
      return value.api === builtInAIApi && selectedTestIds.has(value.id);
    }).map((item: any) => item.testIterationResults || []).flat(1).filter((item: any) => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    const calcAvg = (key: string) => {
      const validVals = items.map((item: any) => item[key]).filter((v: any) => v != null && v !== 0 && v !== -1);
      if (validVals.length > 0) return MathematicalCalculations.calculateAverage(validVals);
      if (items.some((item: any) => item[key] === -1)) return -1;
      return 0;
    };

    return {
      averageTokenPerSecond: calcAvg('tokensPerSecond'),
      averageCharactersPerSecond: calcAvg('charactersPerSecond'),
      averageTimeToFirstToken: calcAvg('timeToFirstToken'),
      averageTotalResponseTime: calcAvg('totalResponseTime'),
    };
  }

  getGlobalSummaryResults(reportData: any, selectedTestIds: Set<string>): AxonSummaryResultsInterface | undefined {
    if (!reportData || !reportData.results || !reportData.results.testsResults || !selectedTestIds) return undefined;

    const results = reportData.results.testsResults;
    const items = results.filter((value: any) => selectedTestIds.has(value.id))
      .map((item: any) => item.testIterationResults || []).flat(1).filter((item: any) => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    const calcAvg = (key: string) => {
      const validVals = items.map((item: any) => item[key]).filter((v: any) => v != null && v !== 0 && v !== -1);
      if (validVals.length > 0) return MathematicalCalculations.calculateAverage(validVals);
      if (items.some((item: any) => item[key] === -1)) return -1;
      return 0;
    };

    return {
      averageTokenPerSecond: calcAvg('tokensPerSecond'),
      averageCharactersPerSecond: calcAvg('charactersPerSecond'),
      averageTimeToFirstToken: calcAvg('timeToFirstToken'),
      averageTotalResponseTime: calcAvg('totalResponseTime'),
    };
  }}
