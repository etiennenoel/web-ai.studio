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
  availableBaselinesIndex: {filename: string, name: string, os?: string, cpu?: string, ram?: number}[] = [];

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.addBaseline('2026-04-03_gemini_3.1_flash', 'Cloud Gemini 3.1 Flash');
      this.addBaseline('2026-04-03_gemini_3.1_flash_lite', 'Cloud Gemini 3.1 Flash Lite');
      this.loadAvailableBaselinesIndex();
    }
  }

  loadAvailableBaselinesIndex(hardwareInfo?: any) {
    this.http.get<{filename: string, name: string, os?: string, cpu?: string, ram?: number}[]>('/data/baselines/index.json').subscribe({
        next: (data) => {
            this.availableBaselinesIndex = data;
            if (hardwareInfo) {
              this.matchAndLoadBaseline(hardwareInfo);
            }
        },
        error: (err) => {
            console.warn('Failed to load baselines index');
        }
    });
  }

  addBaseline(filename: string, name: string) {
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.baselines.some(b => b.id === filename)) return; // Already added

      this.http.get(`/data/baselines/${filename}.json`).subscribe({
          next: (data) => {
              this.baselines.push({ id: filename, name: name, data: data });
          },
          error: (err) => {
              console.error(`Failed to load baseline ${filename}`);
          }
      });
  }

  removeBaseline(id: string) {
      this.baselines = this.baselines.filter(b => b.id !== id);
  }

  loadBaselineData(hardwareInfo: any) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.availableBaselinesIndex.length === 0) {
      this.loadAvailableBaselinesIndex(hardwareInfo);
    } else {
      this.matchAndLoadBaseline(hardwareInfo);
    }
  }

  private matchAndLoadBaseline(hardwareInfo: any) {
    if (!hardwareInfo?.cpu?.modelName) {
      this.addBaseline('apple_m4_max', 'Apple M4 Max'); // Fallback
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
      this.addBaseline(bestMatch.filename, bestMatch.name);
    } else {
      this.addBaseline('apple_m4_max', 'Apple M4 Max'); // Fallback
    }
  }

  getSummaryResults(reportData: any, builtInAIApi: string | number, selectedTestIds: Set<string>): AxonSummaryResultsInterface | undefined {
    if (!reportData || !reportData.results || !reportData.results.testsResults || !selectedTestIds) return undefined;

    const results = reportData.results.testsResults;
    const items = results.filter((value: any) => {
      return value.api === builtInAIApi && selectedTestIds.has(value.id);
    }).map((item: any) => item.testIterationResults || []).flat(1).filter((item: any) => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    return {
      averageTokenPerSecond: MathematicalCalculations.calculateAverage(items.map((item: any) => item.tokensPerSecond ?? 0)),
      averageTimeToFirstToken: MathematicalCalculations.calculateAverage(items.map((item: any) => item.timeToFirstToken ?? 0)),
      averageTotalResponseTime: MathematicalCalculations.calculateAverage(items.map((item: any) => item.totalResponseTime ?? 0)),
    };
  }

  getGlobalSummaryResults(reportData: any, selectedTestIds: Set<string>): AxonSummaryResultsInterface | undefined {
    if (!reportData || !reportData.results || !reportData.results.testsResults || !selectedTestIds) return undefined;

    const results = reportData.results.testsResults;
    const items = results.filter((value: any) => selectedTestIds.has(value.id))
      .map((item: any) => item.testIterationResults || []).flat(1).filter((item: any) => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    return {
      averageTokenPerSecond: MathematicalCalculations.calculateAverage(items.map((item: any) => item.tokensPerSecond ?? 0)),
      averageTimeToFirstToken: MathematicalCalculations.calculateAverage(items.map((item: any) => item.timeToFirstToken ?? 0)),
      averageTotalResponseTime: MathematicalCalculations.calculateAverage(items.map((item: any) => item.totalResponseTime ?? 0)),
    };
  }
}
