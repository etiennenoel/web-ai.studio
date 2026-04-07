import {AfterViewInit, Component, Inject, OnInit, PLATFORM_ID, OnDestroy} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {AxonTestSuiteExecutor} from './axon/axon-test-suite.executor';
import {TestStatus} from '../../enums/test-status.enum';
import {BuiltInAiApi} from '../../enums/built-in-ai-api.enum';
import {AxonTestId} from './axon/enums/axon-test-id.enum';
import {AxonTestInterface} from './axon/interfaces/axon-test.interface';
import {AxonSummaryResultsInterface} from './axon/interfaces/axon-summary-results.interface';
import {MathematicalCalculations} from './axon/util/mathematical-calculations';
import {EnumUtils} from '../../core/utils/enum.utils';
import {ItemInterface} from '../../core/interfaces/item.interface';
import { isPlatformServer } from '@angular/common';
import {ComparisonDataService} from './services/comparison-data.service';

@Component({
  selector: 'page-cortex',
  standalone: false,
  templateUrl: './cortex.page.html',
  styleUrl: './cortex.page.scss'
})
export class CortexPage implements OnInit, AfterViewInit, OnDestroy {

  builtInAiApis: ItemInterface[] = EnumUtils.getItems(BuiltInAiApi);
  selectedTestIds: Set<string> = new Set<string>();

  apiCollapsedState: { [key: string]: boolean | undefined } = {};
  selectedImageUrl: string | null = null;
  isExtensionInstalled: boolean = true; // By default we don't show it.
  
  hardwareInfo: any = null;

  isImportedReport = false;
  importedTimestamp: string | null = null;
  importedUserAgent: string | null = null;

  isGeneratingUrl = false;
  generatedShareUrl: string | null = null;
  showShareModal = false;
  showExtensionModal = false;
  showAboutModal = false;
  showBaselineDropdown = false;
  isUrlCopied = false;

  viewData: { [id in (AxonTestId | "pretests")]: {iterationsCollapsed?:boolean, expandedOutputs?: {[key: number]: boolean}} } = {
    [AxonTestId.LanguageDetectorShortStringColdStart]: {},
    [AxonTestId.LanguageDetectorShortStringWarmStart]: {},
    [AxonTestId.TranslatorShortStringEnglishToFrenchColdStart]: {},
    [AxonTestId.TranslatorShortStringEnglishToFrenchWarmStart]: {},
    [AxonTestId.SummarizerLongNewsArticleColdStart]: {},
    [AxonTestId.SummarizerLongNewsArticleWarmStart]: {},
    [AxonTestId.PromptTextFactAnalysisColdStart]: {},
    [AxonTestId.PromptTextEthicalAndCreativeColdStart]: {},
    [AxonTestId.PromptTextTechnicalChallengeColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenLetter1ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenLetter2ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenLetter3ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenName1ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenName2ColdStart]: {},
    [AxonTestId.PromptImageOcrHandwrittenName3ColdStart]: {},
    [AxonTestId.PromptImageOcrComputerFontColdStart]: {},
    [AxonTestId.PromptImageDescribeColdStart]: {},
    [AxonTestId.PromptImageExplainMemeColdStart]: {},
    [AxonTestId.PromptImageExplainEmotionColdStart]: {},
    [AxonTestId.PromptAudioTranscription119ColdStart]: {},
    [AxonTestId.PromptAudioTranscription4167ColdStart]: {},
    [AxonTestId.PromptAudioTranscription46ColdStart]: {},
    [AxonTestId.PromptAudioTranscription5670ColdStart]: {},
    "pretests": {}
  }

  constructor(
    public readonly axonTestSuiteExecutor: AxonTestSuiteExecutor,
    public readonly comparisonService: ComparisonDataService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object,

  ) {}

  triggerImport() {
    const fileInput = document.getElementById('cortex-report-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          this.loadReport(data);
        } catch (error) {
          console.error("Failed to parse JSON", error);
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    }
    // Clear input so same file can be selected again
    event.target.value = '';
  }

  loadReport(data: any) {
    if (data && data.results) {
      this.axonTestSuiteExecutor.results = data.results;
      this.hardwareInfo = data.hardware;
      this.comparisonService.loadBaselineData(this.hardwareInfo);
      this.importedTimestamp = data.timestamp;
      this.importedUserAgent = data.userAgent;
      
      this.selectedTestIds.clear();
      
      for (const result of data.results.testsResults) {
        if (this.axonTestSuiteExecutor.testIdMap[result.id as AxonTestId]) {
          this.axonTestSuiteExecutor.testIdMap[result.id as AxonTestId].results = result;
          this.selectedTestIds.add(result.id);
        }
      }
      
      this.isImportedReport = true;
      this.axonTestSuiteExecutor.preTestsStatus = TestStatus.Success;
      this.axonTestSuiteExecutor.results.status = TestStatus.Success;
      
    } else {
      alert("Invalid report format");
    }
  }

  async saveReportToUrl() {
    this.isGeneratingUrl = true;
    this.showShareModal = true;
    this.generatedShareUrl = null;

    let hwInfo = this.hardwareInfo;
    if (!hwInfo && this.isExtensionInstalled) {
      try {
        hwInfo = await (window as any).webai.getHardwareInformation();
      } catch (e) {
        console.error("Failed to get hardware info", e);
      }
    }

    const reportData = {
      timestamp: this.importedTimestamp || new Date().toISOString(),
      userAgent: this.importedUserAgent || navigator.userAgent,
      hardware: hwInfo,
      results: this.axonTestSuiteExecutor.results
    };

    try {
      const jsonString = JSON.stringify(reportData);
      
      // Use Compression API to shrink the payload significantly before base64 encoding
      const stream = new Blob([jsonString]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('deflate-raw'));
      const compressedResponse = new Response(compressedStream);
      const buffer = await compressedResponse.arrayBuffer();
      
      // Convert buffer to base64url string
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      // Make it URL safe
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('report', base64url);
      
      this.generatedShareUrl = currentUrl.toString();
      
    } catch (e) {
      console.error('Failed to compress and save report to URL', e);
      alert('Report is too large to save in URL.');
      this.showShareModal = false;
    } finally {
      this.isGeneratingUrl = false;
    }
  }

  async copyShareUrl() {
    if (this.generatedShareUrl) {
      try {
        await navigator.clipboard.writeText(this.generatedShareUrl);
        this.isUrlCopied = true;
        setTimeout(() => {
          this.isUrlCopied = false;
        }, 3000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  }

  closeShareModal() {
    this.showShareModal = false;
    this.isUrlCopied = false;
  }

  async loadReportFromUrl(base64url: string) {
    try {
      // Revert URL safe characters
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }
      
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Decompress
      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
      const decompressedResponse = new Response(decompressedStream);
      const jsonString = await decompressedResponse.text();
      
      const data = JSON.parse(jsonString);
      this.loadReport(data);
    } catch (e) {
      console.error('Failed to load report from URL', e);
      alert('Failed to load report from URL. The link might be broken or expired.');
      // Remove the broken report parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('report');
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }

  resetState() {
    window.location.reload();
  }

  ngOnInit() {
    if(isPlatformServer(this.platformId)) {
      return;
    }

    this.comparisonService.loadBaselineData(this.hardwareInfo);

    this.route.queryParamMap.subscribe(params => {      const reportParam = params.get('report');
      if (reportParam) {
        // If we have a report, prioritize loading it and don't overwrite with default test selections
        this.loadReportFromUrl(reportParam);
        return;
      }
      
      const testsParam = params.get('tests');
      if (testsParam !== null) {
        this.selectedTestIds = new Set(testsParam ? testsParam.split('|') : []);
      } else {
        this.selectedTestIds = new Set(this.axonTestSuiteExecutor.testsSuite);
      }
    });
  }

  ngOnDestroy() {}

  ngAfterViewInit(): void {
    if(isPlatformServer(this.platformId)) {
      return;
    }

    const checkExtension = () => {
      this.isExtensionInstalled = typeof window !== 'undefined' && typeof (window as any).webai !== 'undefined';
      if (this.isExtensionInstalled && !this.hardwareInfo) {
        this.loadInitialHardwareInfo();
      }
    };

    checkExtension();
    if (!this.isExtensionInstalled) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        checkExtension();
        if (this.isExtensionInstalled || attempts > 20) {
          clearInterval(interval);
        }
      }, 50);
    }
  }

  async loadInitialHardwareInfo() {
      try {
        this.hardwareInfo = await (window as any).webai.getHardwareInformation();
        this.comparisonService.loadBaselineData(this.hardwareInfo);
      } catch (e) {
        console.error("Failed to get hardware info", e);
      }
  }

  getComputeUnit(): string {
    if (this.hardwareInfo?.cpu?.modelName) {
      const cores = this.hardwareInfo.cpu.numOfProcessors;
      return cores ? `${this.hardwareInfo.cpu.modelName} (${cores}-Core)` : this.hardwareInfo.cpu.modelName;
    }
    return 'Extension Required';
  }

  getNpuInfo(): string {
    const cpu = this.getComputeUnit();
    if (cpu.includes('Apple M')) {
      return 'Apple Neural Engine';
    }
    if (cpu.includes('Snapdragon')) {
      return 'Qualcomm Hexagon';
    }
    if (cpu.includes('Intel')) {
      return 'Intel NPU (if available)';
    }
    if (cpu.includes('AMD')) {
      return 'AMD Ryzen AI (if available)';
    }
    return 'Unknown or None';
  }

  getMemoryInfo(): string {
    if (this.hardwareInfo?.memory?.capacity) {
      const gb = Math.round(this.hardwareInfo.memory.capacity / (1024 * 1024 * 1024));
      return `${gb} GB RAM`;
    }
    return 'Extension Required';
  }

  getOsProfile(): string {
    if (typeof navigator !== 'undefined') {
       const uaData = (navigator as any).userAgentData;
       if (uaData && uaData.platform) {
         return uaData.platform;
       }
       
       const ua = navigator.userAgent;
       if (ua.includes('Mac OS X')) {
          const match = ua.match(/Mac OS X (\d+[_.]\d+[_.]?\d*)/);
          return match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
       } else if (ua.includes('Windows NT 10.0')) {
          return 'Windows 10/11';
       } else if (ua.includes('Linux')) {
          return 'Linux';
       } else if (ua.includes('Android')) {
          return 'Android';
       } else if (ua.includes('iPhone') || ua.includes('iPad')) {
          return 'iOS / iPadOS';
       }
    }
    return 'Unknown OS';
  }

  getBrowserInfo(): string {
    if (typeof navigator !== 'undefined') {
       const uaData = (navigator as any).userAgentData;
       if (uaData && uaData.brands) {
         const brand = uaData.brands.find((b: any) => !b.brand.includes('Not') && !b.brand.includes('Chromium'));
         if (brand) {
           return `${brand.brand} ${brand.version}`;
         }
       }
       const ua = navigator.userAgent;
       const match = ua.match(/(Chrome|Edg|Safari|Firefox)\/(\d+(\.\d+)?)/);
       if (match) {
         let name = match[1];
         if (name === 'Edg') name = 'Edge';
         return `${name} ${match[2]}`;
       }
    }
    return 'Unknown Browser';
  }

  get isHardwareOptimal(): boolean {
    const cpu = this.getComputeUnit();
    const mem = this.getMemoryInfo();
    return cpu.includes('Apple M') || cpu.includes('Snapdragon') || mem.includes('32 GB') || mem.includes('64 GB');
  }

  getMaxArray(values: number[]): number { return values.length > 0 ? Math.max(...values) : 0; }
  
  getGlobalAllValues(metric: 'ttft' | 'total' | 'speed' | 'charSpeed', coldVal?: number|null, warmVal?: number|null): number[] {
    return [coldVal||0, warmVal||0, ...this.getAllBaselineGlobalValues(metric)];
  }

  getTestAllValues(testId: any, metric: 'ttft' | 'total' | 'speed' | 'charSpeed', coldVal?: number|null, warmVal?: number|null): number[] {
    return [coldVal||0, warmVal||0, ...this.getAllBaselineValues(testId, metric)];
  }

  getMax(...values: (number | null | undefined)[]): number {
    return Math.max(...values.map(v => v || 0));
  }

  getPercentage(val: number | null | undefined, max: number): number {
    if (!val || max === 0) return 0;
    return Math.max(2, (val / max) * 100);
  }

  getAllBaselineGlobalValues(metric: 'ttft' | 'total' | 'speed' | 'charSpeed'): number[] {
    return this.comparisonService.baselines.map(b => {
      const res = this.comparisonService.getGlobalSummaryResults(b.data, this.selectedTestIds);
      if (!res) return 0;
      if (metric === 'ttft') return res.averageTimeToFirstToken || 0;
      if (metric === 'total') return res.averageTotalResponseTime || 0;
      if (metric === 'speed') return res.averageTokenPerSecond || 0;
      if (metric === 'charSpeed') return res.averageCharactersPerSecond || 0;
      return 0;
    });
  }

  getAllBaselineValues(testId: string | number, metric: 'ttft' | 'total' | 'speed' | 'charSpeed'): number[] {
    return this.comparisonService.baselines.map(b => {
      const res = this.comparisonService.getSummaryResults(b.data, testId, this.selectedTestIds);
      if (!res) return 0;
      if (metric === 'ttft') return res.averageTimeToFirstToken || 0;
      if (metric === 'total') return res.averageTotalResponseTime || 0;
      if (metric === 'speed') return res.averageTokenPerSecond || 0;
      if (metric === 'charSpeed') return res.averageCharactersPerSecond || 0;
      return 0;
    });
  }

  isWinner(currentVal: number | null | undefined, allValues: (number | null | undefined)[], metric: 'ttft'|'total'|'speed'|'charSpeed'): boolean {
    const val = currentVal || 0;
    if (val <= 0) return false;

    const activeValues = allValues.map(v => v || 0).filter(v => v > 0);
    if (activeValues.length === 0) return false;

    let bestValue;
    if (metric === 'speed' || metric === 'charSpeed') {
      bestValue = Math.max(...activeValues);
    } else {
      bestValue = Math.min(...activeValues);
    }

    return val === bestValue;
  }

  getSelectedTestsCountForApi(api: BuiltInAiApi): number {
    const tests = this.getTests(api);
    return tests.filter(t => this.selectedTestIds.has(t.id)).length;
  }

  getCategoryStatus(api: BuiltInAiApi): TestStatus {
    const tests = this.getTests(api);
    if (tests.length === 0) return TestStatus.Idle;

    const selectedTests = tests.filter(t => this.selectedTestIds.has(t.id));
    if (selectedTests.length === 0) return TestStatus.Idle;

    if (selectedTests.some(t => t.results.status === TestStatus.Error || t.results.status === TestStatus.Fail)) {
      return TestStatus.Fail;
    }
    if (selectedTests.some(t => t.results.status === TestStatus.Executing)) {
      return TestStatus.Executing;
    }
    if (selectedTests.every(t => t.results.status === TestStatus.Success || t.results.status === TestStatus.Skipped)) {
      if (selectedTests.some(t => t.results.status === TestStatus.Success)) {
        return TestStatus.Success;
      }
    }
    return TestStatus.Idle;
  }

  triggerDownloadResults() {
    if (!this.isExtensionInstalled) {
      this.showExtensionModal = true;
    } else {
      this.downloadResults();
    }
  }

  toggleBaseline(filename: string, name: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.comparisonService.addBaseline(filename, name);
    } else {
      this.comparisonService.removeBaseline(filename);
    }
  }

  isBaselineSelected(filename: string): boolean {
    return this.comparisonService.baselines.some(b => b.id === filename);
  }

  closeExtensionModal() {
    this.showExtensionModal = false;
  }

  openAboutModal() {
    this.showAboutModal = true;
  }

  closeAboutModal() {
    this.showAboutModal = false;
  }

  confirmDownloadResults() {
    this.showExtensionModal = false;
    this.downloadResults();
  }

  async downloadResults() {
    let hardwareInfo = null;
    if (this.isExtensionInstalled) {
      try {
        hardwareInfo = await (window as any).webai.getHardwareInformation();
      } catch (e) {
        console.error("Failed to get hardware info", e);
      }
    }

    const data = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      hardware: hardwareInfo,
      results: this.axonTestSuiteExecutor.results
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortex-benchmark-results-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  toggleTestSelection(testId: string, event?: Event) {
    if (event) event.stopPropagation();
    if (this.selectedTestIds.has(testId)) {
        this.selectedTestIds.delete(testId);
    } else {
        this.selectedTestIds.add(testId);
    }
    this.updateUrl();
  }

  toggleCategorySelection(api: BuiltInAiApi, event?: Event) {
    if (event) event.stopPropagation();
    const tests = this.getTests(api);
    const allSelected = tests.every(t => this.selectedTestIds.has(t.id));
    if (allSelected) {
        tests.forEach(t => this.selectedTestIds.delete(t.id));
    } else {
        tests.forEach(t => this.selectedTestIds.add(t.id));
    }
    this.updateUrl();
  }

  updateUrl() {
    const testsArr = Array.from(this.selectedTestIds);
    this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tests: testsArr.length === this.axonTestSuiteExecutor.testsSuite.length ? null : testsArr.join('|') },
        queryParamsHandling: 'merge'
    });
  }

  isCategorySelected(api: BuiltInAiApi): boolean {
    const tests = this.getTests(api);
    return tests.length > 0 && tests.every(t => this.selectedTestIds.has(t.id));
  }

  isCategoryPartiallySelected(api: BuiltInAiApi): boolean {
    const tests = this.getTests(api);
    if (tests.length === 0) return false;
    const selectedCount = tests.filter(t => this.selectedTestIds.has(t.id)).length;
    return selectedCount > 0 && selectedCount < tests.length;
  }

  isAllSelected(): boolean {
    return this.selectedTestIds.size === this.axonTestSuiteExecutor.testsSuite.length;
  }

  isPartiallySelected(): boolean {
    return this.selectedTestIds.size > 0 && this.selectedTestIds.size < this.axonTestSuiteExecutor.testsSuite.length;
  }

  toggleAllSelection(event?: Event) {
    if (event) event.stopPropagation();
    if (this.isAllSelected()) {
      this.selectedTestIds.clear();
    } else {
      this.selectedTestIds = new Set(this.axonTestSuiteExecutor.testsSuite);
    }
    this.updateUrl();
  }

  stop() {
    this.axonTestSuiteExecutor.stop();
  }

  async start() {
    // Clear explicit collapse overrides so dynamic opening works based on execution status
    this.apiCollapsedState = {};
    
    // Explicitly open the setup details pane so users can watch the status
    this.viewData.pretests.iterationsCollapsed = false;

    this.axonTestSuiteExecutor.isStopped = false;
    this.axonTestSuiteExecutor.resetAbortController();
    await this.axonTestSuiteExecutor.setup(this.selectedTestIds);

    if (this.axonTestSuiteExecutor.isStopped) return;

    this.viewData.pretests.iterationsCollapsed = true;

    // Once everything passes, we can start the tests.
    await this.axonTestSuiteExecutor.start(this.selectedTestIds);

    if (this.axonTestSuiteExecutor.isStopped) return;
    
    await this.generateReport();
  }
  
  async generateReport() {
    if (this.isExtensionInstalled) {
      try {
        this.hardwareInfo = await (window as any).webai.getHardwareInformation();
      } catch (e) {
        console.error("Failed to get hardware info", e);
      }
    }
    
  }
  
  getTestById(id: string): AxonTestInterface | undefined {
    return this.axonTestSuiteExecutor.testIdMap[id as AxonTestId];
  }
  
  forceSetup(testId: AxonTestId): Promise<void> {
    return this.axonTestSuiteExecutor.forceSetup(testId);
  }

  getSummaryResults(builtInAIApi: string | number, startType: "cold" | "warm"): AxonSummaryResultsInterface | undefined {
    const results = this.axonTestSuiteExecutor?.results?.testsResults || [];
    const items = results.filter(value => {
      return value.api === builtInAIApi && value.startType === startType && this.selectedTestIds.has(value.id);
    }).map(item => item.testIterationResults).flat(1).filter(item => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    const calcAvg = (key: string) => {
      const validVals = items.map(item => (item as any)[key]).filter(v => v != null && v !== 0 && v !== -1);
      if (validVals.length > 0) return MathematicalCalculations.calculateAverage(validVals);
      if (items.some(item => (item as any)[key] === -1)) return -1;
      return 0;
    };

    const calcMed = (key: string) => {
      const validVals = items.map(item => (item as any)[key]).filter(v => v != null && v !== 0 && v !== -1);
      if (validVals.length > 0) return MathematicalCalculations.calculateMedian(validVals);
      if (items.some(item => (item as any)[key] === -1)) return -1;
      return 0;
    };

    return {
        averageTokenPerSecond: calcAvg('tokensPerSecond'),
        averageCharactersPerSecond: calcAvg('charactersPerSecond'),
        averageTimeToFirstToken: calcAvg('timeToFirstToken'),
        averageTotalResponseTime: calcAvg('totalResponseTime'),
        medianTimeToFirstToken: calcMed('timeToFirstToken'),
        medianTotalResponseTime: calcMed('totalResponseTime'),
        medianTokenPerSecond: calcMed('tokensPerSecond'),
        medianCharactersPerSecond: calcMed('charactersPerSecond')
    };
  }

  getGlobalSummaryResults(startType: "cold" | "warm"): AxonSummaryResultsInterface | undefined {
    const results = this.axonTestSuiteExecutor?.results?.testsResults || [];
    const items = results.filter(value => {
      return value.startType === startType;
    }).map(item => item.testIterationResults).flat(1).filter(item => item.status === TestStatus.Success);

    if (items.length === 0) return undefined;

    const calcAvg = (key: string) => {
      const validVals = items.map(item => (item as any)[key]).filter(v => v != null && v !== 0 && v !== -1);
      if (validVals.length > 0) return MathematicalCalculations.calculateAverage(validVals);
      if (items.some(item => (item as any)[key] === -1)) return -1;
      return 0;
    };

    const calcMed = (key: string) => {
      const validVals = items.map(item => (item as any)[key]).filter(v => v != null && v !== 0 && v !== -1);
      if (validVals.length > 0) return MathematicalCalculations.calculateMedian(validVals);
      if (items.some(item => (item as any)[key] === -1)) return -1;
      return 0;
    };

    return {
        averageTokenPerSecond: calcAvg('tokensPerSecond'),
        averageCharactersPerSecond: calcAvg('charactersPerSecond'),
        averageTimeToFirstToken: calcAvg('timeToFirstToken'),
        averageTotalResponseTime: calcAvg('totalResponseTime'),
        medianTimeToFirstToken: calcMed('timeToFirstToken'),
        medianTotalResponseTime: calcMed('totalResponseTime'),
        medianTokenPerSecond: calcMed('tokensPerSecond'),
        medianCharactersPerSecond: calcMed('charactersPerSecond')
    };
  }

  getGlobalPassedAndFailed(): { passed: number, failed: number } {
    const results = this.axonTestSuiteExecutor?.results?.testsResults || [];
    const passed = results.filter(r => r.status === TestStatus.Success).length;
    const failed = results.filter(r => r.status === TestStatus.Fail || r.status === TestStatus.Error).length;
    return { passed, failed };
  }

  getTestedApiCategoriesCount(): number {
    const results = this.axonTestSuiteExecutor?.results?.testsResults || [];
    const testedApis = new Set(results.filter(r => r.status !== TestStatus.Idle).map(r => r.api));
    return testedApis.size;
  }

  getTests(api: BuiltInAiApi) {
    return this.axonTestSuiteExecutor.testsSuite.filter(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId].results.api === api;
    }).sort((a, b) => {
      return a.localeCompare(b, "en");
    }).map(testId => {
      return this.axonTestSuiteExecutor.testIdMap[testId];
    });
  }

  getBuiltInAiAPIFromItemInterface(item: ItemInterface): BuiltInAiApi {
    return item.id as BuiltInAiApi;
  }

  get isTestingRunning(): boolean {
    return this.isImportedReport || 
           this.axonTestSuiteExecutor.results.status === TestStatus.Executing || 
           this.axonTestSuiteExecutor.preTestsStatus === TestStatus.Executing;
  }

  get isReportReady(): boolean {
    if (this.isImportedReport) return true;
    if (this.axonTestSuiteExecutor.results.status === TestStatus.Success || this.axonTestSuiteExecutor.results.status === TestStatus.Error) {
      return this.getOverallProgress().percentage === 100;
    }
    return false;
  }

  get currentExecutingTest(): AxonTestInterface | null {
    if (this.axonTestSuiteExecutor.results.status !== TestStatus.Executing) return null;
    
    for (const testId of this.axonTestSuiteExecutor.testsSuite) {
      const test = this.axonTestSuiteExecutor.testIdMap[testId];
      if (test.results.status === TestStatus.Executing) {
        return test;
      }
    }
    return null;
  }

  getApiProgress(api: BuiltInAiApi) {
    const allTests = this.getTests(api);
    const tests = allTests.filter(t => this.selectedTestIds.has(t.id));
    if (tests.length === 0) return { total: allTests.length, selected: 0, completed: 0, percentage: 0, passed: 0, failed: 0, executing: 0, idle: 0 };
    let completed = 0;
    let passed = 0;
    let failed = 0;
    let executing = 0;
    let idle = 0;
    for (const test of tests) {
      if (test.results.status === TestStatus.Success) {
        completed++;
        passed++;
      } else if (test.results.status === TestStatus.Error) {
        completed++;
        failed++;
      } else if (test.results.status === TestStatus.Executing) {
        executing++;
      } else if (test.results.status === TestStatus.Idle) {
        idle++;
      } else if (test.results.status === TestStatus.Skipped) {
        completed++;
      }
    }
    return {
      total: allTests.length,
      selected: tests.length,
      completed,
      passed,
      failed,
      executing,
      idle,
      percentage: Math.round((completed / tests.length) * 100)
    };
  }

  getOverallProgress() {
    const tests = this.axonTestSuiteExecutor.testsSuite.filter(id => this.selectedTestIds.has(id));
    if (tests.length === 0) return { total: 0, completed: 0, percentage: 0 };
    let completed = 0;
    for (const testId of tests) {
      const test = this.axonTestSuiteExecutor.testIdMap[testId];
      if (test.results.status === TestStatus.Success || test.results.status === TestStatus.Error || test.results.status === TestStatus.Skipped) {
        completed++;
      }
    }
    return {
      total: tests.length,
      completed,
      percentage: Math.round((completed / tests.length) * 100)
    };
  }

  isApiCollapsed(api: BuiltInAiApi, progress: {percentage: number}): boolean {
    if (this.apiCollapsedState[api] !== undefined) {
      return this.apiCollapsedState[api]!;
    }
    
    // If any test in this API is explicitly expanded by user or has expanded outputs, keep the API expanded
    const tests = this.getTests(api);
    const hasExpandedTest = tests.some(test => {
      if (this.viewData[test.id].iterationsCollapsed === false) return true;
      if (this.viewData[test.id].expandedOutputs && Object.values(this.viewData[test.id].expandedOutputs!).some(v => v)) return true;
      return false;
    });

    if (hasExpandedTest) {
      return false;
    }

    // Dynamic logic based on execution state
    if (this.axonTestSuiteExecutor.results.status === TestStatus.Executing) {
       // Expand if it's the currently executing API
       if (this.currentExecutingTest?.results?.api === api) {
         return false; // expanded
       }
       // Collapse if it's completed
       if (progress.percentage === 100) {
         return true; // collapsed
       }
       // Collapse if it hasn't started yet
       if (progress.percentage === 0) {
         return true; // collapsed
       }
    }
    
    // Default collapsed
    return true;
  }

  toggleApi(api: BuiltInAiApi, progress: {percentage: number}) {
    this.apiCollapsedState[api] = !this.isApiCollapsed(api, progress);
  }

  toggleOutput(testId: AxonTestId, index: number) {
    if (!this.viewData[testId].expandedOutputs) {
      this.viewData[testId].expandedOutputs = {};
    }
    this.viewData[testId].expandedOutputs![index] = !this.viewData[testId].expandedOutputs![index];
  }

  getIconForApi(api: BuiltInAiApi): string {
    switch (api) {
      case BuiltInAiApi.LanguageDetector: return 'bi-search';
      case BuiltInAiApi.Translator: return 'bi-translate';
      case BuiltInAiApi.Summarizer: return 'bi-card-text';
      case BuiltInAiApi.PromptWithImage: return 'bi-image';
      case BuiltInAiApi.Prompt:
      case BuiltInAiApi.PromptWithAudio:
        return 'bi-chat-text';
      case BuiltInAiApi.Proofreader: return 'bi-spellcheck';
      case BuiltInAiApi.Rewriter: return 'bi-pencil-square';
      case BuiltInAiApi.Writer: return 'bi-pen';
      default: return 'bi-cpu';
    }
  }

  isTestCollapsed(test: AxonTestInterface): boolean {
    if (this.viewData[test.id].iterationsCollapsed !== undefined) {
      return this.viewData[test.id].iterationsCollapsed!;
    }
    
    // If any output is expanded, keep it expanded
    if (this.viewData[test.id].expandedOutputs && Object.values(this.viewData[test.id].expandedOutputs!).some(v => v)) {
      return false;
    }
    
    return test.results.status !== TestStatus.Executing;
  }

  toggleTest(testId: AxonTestId) {
    const test = this.axonTestSuiteExecutor.testIdMap[testId];
    this.viewData[testId].iterationsCollapsed = !this.isTestCollapsed(test);
  }

  unescapeOutput(output: string): string {
    return output.replace(/\\\\/g, '\\') // 1. Unescape backslashes
      .replace(/\\"/g, '"')   // 2. Unescape double quotes
      .replace(/\\'/g, "'")   // 3. Unescape single quotes
      .replace(/\\n/g, '\n')   // 4. Unescape newlines
      .replace(/\\r/g, '\r')   // 5. Unescape carriage returns
      .replace(/\\t/g, '\t')   // 6. Unescape tabs
      .replace(/\\b/g, '\b')   // 7. Unescape backspaces
      .replace(/\\f/g, '\f');  // 8. Unescape form feeds;
  }

  protected readonly TestStatus = TestStatus;

  openImage(url: string, event: Event) {
    event.stopPropagation();
    this.selectedImageUrl = url;
  }

  closeImage() {
    this.selectedImageUrl = null;
  }

  getBaselineDetails(id: string) {
    return this.comparisonService.availableBaselinesIndex.find(b => b.filename === id);
  }

  getExecutionTypeIcon(type?: string): string {
    switch(type?.toUpperCase()) {
      case 'CPU': return 'bi-cpu';
      case 'GPU': return 'bi-gpu-card';
      case 'NPU': return 'bi-motherboard';
      case 'CLOUD': return 'bi-cloud';
      default: return 'bi-gear';
    }
  }

  getExecutionTypeColorClass(type?: string): string {
    switch(type?.toUpperCase()) {
      case 'CPU': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      case 'GPU': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50';
      case 'NPU': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'CLOUD': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  }
}
