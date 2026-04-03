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

  baselineData: any = null;
  baselineModelName: string | null = null;

  cloudFlashData: any = null;
  cloudFlashModelName: string | null = null;

  cloudFlashLiteData: any = null;
  cloudFlashLiteModelName: string | null = null;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    // Load a default cloud model comparison
    if (isPlatformBrowser(this.platformId)) {
      this.loadCloudFlashData('2026-04-03_gemini_3.1_flash', 'Gemini 3.1 Flash');
      this.loadCloudFlashLiteData('2026-04-03_gemini_3.1_flash_lite', 'Gemini 3.1 Flash Lite');
    }
  }

  loadBaselineData(hardwareInfo: any) {
    if (!isPlatformBrowser(this.platformId)) return;

    let candidates: {filename: string, modelName: string}[] = [];

    const defaultFilename = 'apple_m4_max';
    const defaultModelName = 'Apple M4 Max';

    if (hardwareInfo?.cpu?.modelName) {
        const rawModelName = hardwareInfo.cpu.modelName;
        const baseFilename = rawModelName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        
        let targetGb = 0;
        if (hardwareInfo?.memory?.capacity) {
            targetGb = Math.round(hardwareInfo.memory.capacity / (1024 * 1024 * 1024));
        }

        if (targetGb > 0) {
            // 1. Exact match
            candidates.push({filename: `${baseFilename}_${targetGb}gb`, modelName: `${rawModelName} ${targetGb}GB`});

            // 2. Closest standard RAM sizes
            const commonRamSizes = [8, 12, 16, 18, 24, 32, 36, 48, 64, 72, 96, 128];
            const sortedSizes = [...commonRamSizes]
                .filter(size => size !== targetGb)
                .sort((a, b) => Math.abs(a - targetGb) - Math.abs(b - targetGb));
            
            // Try top 4 closest
            for (let i = 0; i < 4; i++) {
                candidates.push({filename: `${baseFilename}_${sortedSizes[i]}gb`, modelName: `${rawModelName} ${sortedSizes[i]}GB`});
            }
        }
        
        // 3. Base model with no RAM specified
        candidates.push({filename: baseFilename, modelName: rawModelName});
    }
    
    // 4. Ultimate fallback
    candidates.push({filename: defaultFilename, modelName: defaultModelName});

    // Deduplicate candidates
    const seen = new Set<string>();
    candidates = candidates.filter(c => {
        if (seen.has(c.filename)) return false;
        seen.add(c.filename);
        return true;
    });

    this.tryLoadNextBaseline(candidates, 0);
  }

  private tryLoadNextBaseline(candidates: {filename: string, modelName: string}[], index: number) {
      if (index >= candidates.length) {
          this.baselineData = null;
          this.baselineModelName = null;
          return;
      }

      const candidate = candidates[index];
      
      this.http.get(`/data/baselines/${candidate.filename}.json`).subscribe({
          next: (data) => {
              this.baselineData = data;
              this.baselineModelName = candidate.modelName;
          },
          error: (err) => {
              // Not found, try next
              this.tryLoadNextBaseline(candidates, index + 1);
          }
      });
  }

  loadCloudFlashData(filename: string, modelName: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cloudFlashModelName = modelName;
    this.http.get(`/data/cloud/${filename}.json`).subscribe({
      next: (data) => {
        this.cloudFlashData = data;
      },
      error: (err) => {
        console.warn(`Cloud data for ${filename} not found.`);
        this.cloudFlashData = null;
      }
    });
  }

  loadCloudFlashLiteData(filename: string, modelName: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cloudFlashLiteModelName = modelName;
    this.http.get(`/data/cloud/${filename}.json`).subscribe({
      next: (data) => {
        this.cloudFlashLiteData = data;
      },
      error: (err) => {
        console.warn(`Cloud data for ${filename} not found.`);
        this.cloudFlashLiteData = null;
      }
    });
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
