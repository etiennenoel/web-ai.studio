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
  availableBaselinesIndex: {filename: string, name: string}[] = [];

  

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    // Load a default cloud model comparison
    if (isPlatformBrowser(this.platformId)) {
      this.addBaseline('2026-04-03_gemini_3.1_flash', 'Cloud Gemini 3.1 Flash');
      this.addBaseline('2026-04-03_gemini_3.1_flash_lite', 'Cloud Gemini 3.1 Flash Lite');
      this.loadAvailableBaselinesIndex();
    }
  }

  loadAvailableBaselinesIndex() {
    this.http.get<{filename: string, name: string}[]>('/data/baselines/index.json').subscribe({
        next: (data) => {
            this.availableBaselinesIndex = data;
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
          
          return;
      }

      const candidate = candidates[index];
      
      this.http.get(`/data/baselines/${candidate.filename}.json`).subscribe({
          next: (data) => {
              if (!this.baselines.some(b => b.id === candidate.filename)) {
                  this.baselines.push({ id: candidate.filename, name: candidate.modelName, data: data });
              }
          },
          error: (err) => {
              // Not found, try next
              this.tryLoadNextBaseline(candidates, index + 1);
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
