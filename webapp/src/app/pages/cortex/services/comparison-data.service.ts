import {Injectable, Inject, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AxonSummaryResultsInterface} from '../axon/interfaces/axon-summary-results.interface';
import {SummaryResultsCalculator} from '../axon/util/summary-results.calculator';
import { isPlatformBrowser } from '@angular/common';
import { GlobalFilterService } from './global-filter.service';

@Injectable({
  providedIn: 'root'
})
export class ComparisonDataService {

  availableBaselinesIndex: {filename: string, name: string, os?: string, cpu?: string, ram?: number, model?: string, executionType?: 'CPU' | 'GPU' | 'NPU' | 'Cloud', hw?: string, compute?: string, engine?: string}[] = [];

  // Global Filter State
  hardwareOptions: string[] = ['All'];
  computeOptions: string[] = ['All'];
  engineOptions: string[] = ['All'];
  variantOptions: string[] = ['All'];
  apiOptions: string[] = ['All'];

  selectedHardwares: string[] = [];
  selectedComputes: string[] = [];
  selectedEngines: string[] = [];
  selectedVariants: string[] = [];
  selectedApis: string[] = [];



  private readonly LOCAL_STORAGE_KEY = 'cortex_selected_baselines';
  private intendedSelections: Map<string, string> = new Map<string, string>();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object, private filterService: GlobalFilterService) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAvailableBaselinesIndex(undefined, true);
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

  
  _allBaselines: { id: string, name: string, data: any, os?: string, cpu?: string, ram?: number, model?: string, executionType?: string, hw: string, compute: string, engine: string }[] = [];

  get baselines() {
    return this._allBaselines.filter(b => {
      if (!this.filterService.selectedHardwares.includes(b.hw)) return false;
      if (!this.filterService.selectedComputes.includes(b.compute)) return false;
      if (!this.filterService.selectedEngines.includes(b.engine)) return false;
      if (!this.filterService.selectedVariants.includes(b.model || 'Unknown')) return false;
      
      if (this.filterService.searchQuery) {
        const searchTarget = `${b.hw} ${b.model} ${b.engine} ${b.compute}`.toLowerCase();
        if (!searchTarget.includes(this.filterService.searchQuery)) return false;
      }
      return true;
    });
  }

  loadAvailableBaselinesIndex(hardwareInfo?: any, initializeFromStorage: boolean = false) {
    this.http.get<any[]>("/data/baselines/index.json").subscribe({
        next: (data) => {
            this.availableBaselinesIndex = data;
            
            const hwSet = new Set<string>();
            const computeSet = new Set<string>();
            const engineSet = new Set<string>();
            const variantSet = new Set<string>();
            const apiSet = new Set<string>();

            // Auto fetch all baselines
            let fetches = 0;
            data.forEach(idx => {
               this.http.get(`/data/baselines/${idx.filename}.json`).subscribe(jsonData => {
                   let engine = idx.engine || 'Gemini API';
                   if (!idx.engine) {
                     const fn = idx.filename.toLowerCase();
                     if (fn.includes('llminferenceengine')) engine = 'LLM IE';
                     else if (fn.includes('litertlm')) engine = 'LITERT-LM';
                   }

                   const hw = idx.hw || idx.name;
                   const compute = idx.compute || idx.executionType || 'CPU';

                   this._allBaselines.push({ id: idx.filename, name: idx.name, data: jsonData, os: idx.os, cpu: idx.cpu, ram: idx.ram, model: idx.model, executionType: idx.executionType, hw, compute, engine });

                   hwSet.add(hw);
                   computeSet.add(compute);
                   engineSet.add(engine);
                   variantSet.add(idx.model || "Unknown");
                   if ((jsonData as any).results && (jsonData as any).results.testsResults) {
                     (jsonData as any).results.testsResults.forEach((t: any) => {
                       apiSet.add(t.api);
                     });
                   }

                   fetches++;
                   if (fetches === data.length) {
                     this.filterService.setOptions(Array.from(hwSet).sort(), Array.from(computeSet).sort(), Array.from(engineSet).sort(), Array.from(variantSet).sort(), Array.from(apiSet).sort());
                   }
               });
            });
        }
    });
  }
getSummaryResults(reportData: any, builtInAIApi: string | number, selectedTestIds: Set<string>, ignoreSelection: boolean = false): AxonSummaryResultsInterface | undefined {
    if (!reportData?.results?.testsResults) return undefined;

    return SummaryResultsCalculator.fromTestResults(
      reportData.results.testsResults,
      { api: builtInAIApi, selectedTestIds, ignoreSelection }
    );
  }

  getTestSpecificSummaryResults(reportData: any, testId: string): AxonSummaryResultsInterface | undefined {
    if (!reportData?.results?.testsResults) return undefined;

    return SummaryResultsCalculator.fromTestResults(
      reportData.results.testsResults,
      { testId, ignoreSelection: true }
    );
  }

  getGlobalSummaryResults(reportData: any, selectedTestIds: Set<string>, ignoreSelection: boolean = false): AxonSummaryResultsInterface | undefined {
    if (!reportData?.results?.testsResults) return undefined;

    return SummaryResultsCalculator.fromTestResults(
      reportData.results.testsResults,
      { selectedTestIds, ignoreSelection }
    );
  }
}
