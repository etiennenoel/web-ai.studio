import {
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BasePage } from '../base-page';
import {
  ClassifierSchema,
  ClassifierService,
  ExtensionClassifierModelStatus,
} from '../../core/services/classifier.service';
import {
  DECISION_MODEL_CATALOG,
  DecisionBenchmarkBaseline,
  DecisionBenchmarkCase,
  DecisionBenchmarkPack,
  DecisionBenchmarkSuiteRunResult,
  DecisionCaseEvalRecord,
  DecisionModelCatalogItem,
  DecisionQuestionEvalRecord,
} from './decisions-benchmark.models';
import { DecisionsMetricsCalculator } from './decisions-metrics.calculator';

interface SuiteManifestEntry {
  id: string;
  shortName: string;
  name: string;
  badge: string;
  icon: string;
  category: string;
  file: string;
}

@Component({
  selector: 'app-decisions-benchmark-page',
  templateUrl: './decisions-benchmark.page.html',
  styleUrl: './decisions-benchmark.page.scss',
  standalone: false,
  host: {
    class: 'block w-full h-full overflow-y-auto bg-slate-50 dark:bg-[#121212]',
  },
})
export class DecisionsBenchmarkPage extends BasePage implements OnInit, OnDestroy {
  readonly suiteManifest: SuiteManifestEntry[] = [
    {
      id: 'jev-ag-news',
      shortName: 'AG News (Topic)',
      name: 'JEV-Bench: AG News (4-Way Topic)',
      badge: 'JEV-Bench',
      icon: 'bi-newspaper',
      category: 'jev-bench',
      file: 'data/decisions-benchmarks/jev-ag-news.json',
    },
    {
      id: 'jev-emotion',
      shortName: 'DAIR Emotion',
      name: 'JEV-Bench: DAIR Emotion (6-Way)',
      badge: 'JEV-Bench · Held-Out',
      icon: 'bi-emoji-smile',
      category: 'jev-bench',
      file: 'data/decisions-benchmarks/jev-emotion.json',
    },
    {
      id: 'jev-banking',
      shortName: 'Banking77 Intent',
      name: 'JEV-Bench & DMB: Banking Intent (16-Way)',
      badge: 'JEV-Bench / DMB S1',
      icon: 'bi-bank',
      category: 'jev-bench',
      file: 'data/decisions-benchmarks/jev-banking.json',
    },
    {
      id: 'laya-typed-decisions',
      shortName: 'Typed-Decisions',
      name: 'Typed-Decisions Multi-Primitive Workflow Suite',
      badge: '4 Workflows · 5 Qs/Case',
      icon: 'bi-diagram-3',
      category: 'typed-decisions',
      file: 'data/decisions-benchmarks/laya-typed-decisions.json',
    },
    {
      id: 'dmb-robustness',
      shortName: 'DMB Robustness',
      name: 'DMB: Spam Gate (S2) & Option-Order Stability (S4)',
      badge: 'Order Flip Rate',
      icon: 'bi-shield-check',
      category: 'dmb',
      file: 'data/decisions-benchmarks/dmb-robustness.json',
    },
    {
      id: 'app-guardrails-moderation',
      shortName: 'LLM Guardrails',
      name: 'LLM Guardrails & Toxicity Moderation (Held-Out)',
      badge: '2-Gate Safety',
      icon: 'bi-shield-exclamation',
      category: 'applications',
      file: 'data/decisions-benchmarks/app-guardrails-moderation.json',
    },
    {
      id: 'massive-multilingual',
      shortName: 'MASSIVE Multilingual',
      name: 'MASSIVE Multilingual Intent (6 Languages)',
      badge: 'EN · FR · ES · DE · JA · HI',
      icon: 'bi-translate',
      category: 'multilingual',
      file: 'data/decisions-benchmarks/massive-multilingual.json',
    },
    {
      id: 'litert-parity-gate',
      shortName: 'LiteRT Parity Gate',
      name: 'LiteRT Browser Numerical Parity Gate (FP32 vs WebGPU)',
      badge: 'Golden Reference',
      icon: 'bi-cpu-fill',
      category: 'parity',
      file: 'data/decisions-benchmarks/litert-parity-gate.json',
    },
  ];

  readonly modelCatalog: DecisionModelCatalogItem[] = DECISION_MODEL_CATALOG;

  readonly sampleSizeOptions: Array<{ value: number; label: string; hint: string }> = [
    { value: 15, label: 'Quick (15 cases)', hint: '~0.4s on WebGPU' },
    { value: 40, label: 'Standard (40 cases)', hint: '~1.2s on WebGPU' },
    { value: 100, label: 'Full Suite (All cases)', hint: '~2.5s on WebGPU' },
  ];

  selectedSuiteId = 'laya-typed-decisions';
  activePack: DecisionBenchmarkPack | null = null;
  private packCache = new Map<string, DecisionBenchmarkPack>();
  isLoadingPack = false;

  selectedSampleSize = 40;
  forceColdStart = false;
  persistRunsLocally = true;
  customRunLabel = '';

  // Inline rename state
  editingRunId: string | null = null;
  editingRunName = '';

  private static readonly STORAGE_KEY_RUNS = 'webai_decisions_benchmark_runs_v1';
  private static readonly STORAGE_KEY_SETTINGS = 'webai_decisions_benchmark_settings_v1';
  private relativeTimeInterval: any = null;

  // Runtime & Model state
  isSupported = false;
  isPolyfilled = false;
  availabilityStatus = 'checking...';
  extensionModels: ExtensionClassifierModelStatus[] = [];
  selectedModelId = 'laya-td-s256-embeds-wfp16';
  activeExtensionModelId = '';
  isSwitchingModel = false;
  isDownloadingModel = false;
  downloadProgress = 0;

  // Benchmark Execution State
  isRunning = false;
  runStatusText = '';
  progressCompleted = 0;
  progressTotal = 0;
  liveAccuracy = 0;
  liveLatencyP50Ms = 0;
  liveDecisionsPerSec = 0;
  errorMessage = '';

  // Results & History
  currentResult: DecisionBenchmarkSuiteRunResult | null = null;
  runHistory: DecisionBenchmarkSuiteRunResult[] = [];

  // Inspector Filters
  inspectorFilter: 'all' | 'errors' | 'high_conf_errors' | 'flipped' = 'all';
  inspectorSearch = '';
  expandedQuestionIndex: number | null = null;

  private abortController: AbortController | null = null;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) platformId: Object,
    title: Title,
    private readonly classifierService: ClassifierService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {
    super(document, title);
    this.isBrowser = isPlatformBrowser(platformId);
    this.setTitle('Decisions Benchmark (JEV-Bench & Laya)');
  }

  override async ngOnInit() {
    super.ngOnInit();
    if (!this.isBrowser) return;

    this.loadSavedStateFromStorage();
    await this.refreshRuntimeStatus();

    const initialSuite = this.route.snapshot.queryParamMap.get('suite');
    if (initialSuite && this.suiteManifest.some((s) => s.id === initialSuite)) {
      this.selectedSuiteId = initialSuite;
    }
    await this.selectSuite(this.selectedSuiteId, false);

    this.subscriptions.push(
      this.route.queryParamMap.subscribe((params) => {
        const suiteParam = params.get('suite');
        if (
          suiteParam &&
          suiteParam !== this.selectedSuiteId &&
          this.suiteManifest.some((s) => s.id === suiteParam) &&
          !this.isRunning
        ) {
          void this.selectSuite(suiteParam, false);
        }
      })
    );

    // Refresh relative time strings ("just now" -> "1 minute ago") every 15s
    this.relativeTimeInterval = setInterval(() => {
      if (this.runHistory.length > 0) {
        this.cdr.detectChanges();
      }
    }, 15000);
  }

  override ngOnDestroy() {
    if (this.relativeTimeInterval) {
      clearInterval(this.relativeTimeInterval);
      this.relativeTimeInterval = null;
    }
    this.stopBenchmark();
    this.classifierService.clearSessions();
    super.ngOnDestroy();
  }

  async refreshRuntimeStatus(): Promise<void> {
    this.isSupported = this.classifierService.isSupported();
    this.isPolyfilled = this.classifierService.isPolyfilled();
    this.availabilityStatus = await this.classifierService.availability();

    const extList = await this.classifierService.listExtensionModels();
    if (extList) {
      this.extensionModels = extList.models;
      this.activeExtensionModelId = extList.activeVariantId;
      this.selectedModelId = extList.activeVariantId;
    }
    this.cdr.detectChanges();
  }

  async onModelSelectChange(newModelId: string): Promise<void> {
    this.selectedModelId = newModelId;
    if (!this.isPolyfilled && this.extensionModels.length === 0) return;

    this.isSwitchingModel = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    try {
      const updated = await this.classifierService.setActiveExtensionModel(newModelId);
      if (updated) {
        this.extensionModels = updated.models;
        this.activeExtensionModelId = updated.activeVariantId;
      }
      this.availabilityStatus = await this.classifierService.availability();
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to switch active model in extension.';
    } finally {
      this.isSwitchingModel = false;
      this.cdr.detectChanges();
    }
  }

  async downloadSelectedModel(): Promise<void> {
    if (this.isDownloadingModel) return;
    this.isDownloadingModel = true;
    this.downloadProgress = 0;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      await this.classifierService.downloadExtensionModel(this.selectedModelId, (loaded) => {
        this.ngZone.run(() => {
          this.downloadProgress = Math.round(loaded * 100);
          this.cdr.detectChanges();
        });
      });
      await this.refreshRuntimeStatus();
    } catch (e: any) {
      this.errorMessage = e?.message || 'Model download failed.';
    } finally {
      this.isDownloadingModel = false;
      this.cdr.detectChanges();
    }
  }

  getSelectedModelCatalogItem(): DecisionModelCatalogItem | undefined {
    return this.modelCatalog.find((m) => m.id === this.selectedModelId);
  }

  getExtensionModelStatus(variantId: string): ExtensionClassifierModelStatus | undefined {
    return this.extensionModels.find((m) => m.variantId === variantId);
  }

  async selectSuite(suiteId: string, syncUrl = true): Promise<void> {
    this.selectedSuiteId = suiteId;
    this.errorMessage = '';
    this.expandedQuestionIndex = null;

    if (syncUrl && this.isBrowser) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { suite: suiteId },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    const cached = this.packCache.get(suiteId);
    if (cached) {
      this.activePack = cached;
      this.syncLatestResultForSuite(suiteId);
      this.cdr.detectChanges();
      return;
    }

    const entry = this.suiteManifest.find((s) => s.id === suiteId);
    if (!entry) return;

    this.isLoadingPack = true;
    this.cdr.detectChanges();
    try {
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error(`Failed to load benchmark pack (${res.status})`);
      const pack = (await res.json()) as DecisionBenchmarkPack;
      this.packCache.set(suiteId, pack);
      this.activePack = pack;
      this.syncLatestResultForSuite(suiteId);
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to load benchmark dataset.';
    } finally {
      this.isLoadingPack = false;
      this.cdr.detectChanges();
    }
  }

  private syncLatestResultForSuite(suiteId: string): void {
    const match = this.runHistory.find((r) => r.suiteId === suiteId);
    this.currentResult = match ?? null;
  }

  stopBenchmark(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
    this.runStatusText = 'Stopped';
    this.cdr.detectChanges();
  }

  async runSelectedSuite(): Promise<void> {
    if (!this.activePack || this.isRunning) return;
    await this.executeBenchmarkSuites([this.activePack]);
  }

  async runAllSuites(): Promise<void> {
    if (this.isRunning) return;
    const packs: DecisionBenchmarkPack[] = [];
    for (const entry of this.suiteManifest) {
      let pack = this.packCache.get(entry.id);
      if (!pack) {
        const res = await fetch(entry.file);
        if (res.ok) {
          pack = (await res.json()) as DecisionBenchmarkPack;
          this.packCache.set(entry.id, pack);
        }
      }
      if (pack) packs.push(pack);
    }
    if (packs.length > 0) {
      await this.executeBenchmarkSuites(packs);
    }
  }

  private async executeBenchmarkSuites(packs: DecisionBenchmarkPack[]): Promise<void> {
    const api = this.classifierService.getNativeApi();
    if (!api) {
      this.errorMessage =
        'window.DecisionModel is not available. Enable #decisions-api in Chrome or install the WebAI Extension.';
      return;
    }

    this.isRunning = true;
    this.errorMessage = '';
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Ensure selected extension model is active if using extension
      if (this.extensionModels.length > 0 && this.selectedModelId !== this.activeExtensionModelId) {
        this.runStatusText = `Switching active model to ${this.selectedModelId}...`;
        this.cdr.detectChanges();
        await this.onModelSelectChange(this.selectedModelId);
      }

      if (this.forceColdStart && this.extensionModels.length > 0) {
        this.runStatusText = 'Unloading model for cold-start measurement...';
        this.cdr.detectChanges();
        await this.classifierService.unloadExtensionModel();
      } else {
        this.classifierService.clearSessions();
      }

      for (const pack of packs) {
        if (signal.aborted) break;
        this.activePack = pack;
        this.selectedSuiteId = pack.id;
        const result = await this.runSinglePack(pack, api, signal);
        if (result) {
          this.currentResult = result;
          this.runHistory = [result, ...this.runHistory];
          this.saveRunsToStorage();
        }
        this.cdr.detectChanges();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        this.errorMessage = e?.message || 'Benchmark execution failed.';
      }
    } finally {
      this.isRunning = false;
      this.runStatusText = '';
      this.abortController = null;
      await this.refreshRuntimeStatus();
      this.cdr.detectChanges();
    }
  }

  private async runSinglePack(
    pack: DecisionBenchmarkPack,
    api: any,
    signal: AbortSignal
  ): Promise<DecisionBenchmarkSuiteRunResult | null> {
    let casesToRun = pack.cases.slice(0, Math.min(this.selectedSampleSize, pack.cases.length));

    // For Parity Gate, filter to rows matching the active checkpoint family if possible
    if (pack.id === 'litert-parity-gate') {
      const targetTag = this.selectedModelId.startsWith('laya-td')
        ? 'laya-td-s256'
        : this.selectedModelId.startsWith('laya-ml')
          ? 'laya-ml-s256'
          : null;
      if (targetTag) {
        const filtered = pack.cases.filter((c) => c.referenceModel === targetTag);
        if (filtered.length > 0) {
          casesToRun = filtered.slice(0, Math.min(this.selectedSampleSize, filtered.length));
        }
      }
    }

    this.progressTotal = casesToRun.length;
    this.progressCompleted = 0;
    this.liveAccuracy = 0;
    this.liveLatencyP50Ms = 0;
    this.liveDecisionsPerSec = 0;

    const sessionBySchemaKey = new Map<string, any>();
    let coldCreateMs: number | null = null;
    const warmCreateTimes: number[] = [];
    const caseRecords: DecisionCaseEvalRecord[] = [];
    const suiteStartMs = performance.now();

    try {
      for (let i = 0; i < casesToRun.length; i++) {
        signal.throwIfAborted();
        const c = casesToRun[i];
        const schema = c.schema ?? pack.sharedSchema;
        if (!schema) continue;

        const schemaKey = JSON.stringify(schema);
        let session = sessionBySchemaKey.get(schemaKey);

        if (!session) {
          this.runStatusText =
            coldCreateMs === null
              ? `Compiling DecisionModel session (${pack.shortName})...`
              : `Compiling workflow schema (${c.workflow || pack.shortName})...`;
          this.cdr.detectChanges();

          const tCreate0 = performance.now();
          session = await api.create({
            ...schema,
            signal,
            monitor: (m: any) => {
              m.addEventListener('downloadprogress', (ev: any) => {
                this.ngZone.run(() => {
                  this.downloadProgress = Math.round((ev.loaded ?? 0) * 100);
                  this.runStatusText = `Downloading model weights (${this.downloadProgress}%)...`;
                  this.cdr.detectChanges();
                });
              });
            },
          });
          const createElapsed = Number((performance.now() - tCreate0).toFixed(1));
          if (coldCreateMs === null) {
            coldCreateMs = createElapsed;
          } else {
            warmCreateTimes.push(createElapsed);
          }
          sessionBySchemaKey.set(schemaKey, session);
        }

        this.runStatusText = `Evaluating ${pack.shortName} (${i + 1}/${casesToRun.length})...`;

        const { raw, decideLatencyMs, usedInput } = await this.executeDecideWithQuotaFit(
          session,
          c.input,
          signal
        );

        const normalized = this.classifierService.normalizeResult(schema, raw, decideLatencyMs);
        const headTokens = Number(session.contextUsage ?? 0);
        let stateTokens = 0;
        if (typeof session.measureContextUsage === 'function') {
          try {
            stateTokens = Number(await session.measureContextUsage(usedInput));
          } catch {}
        }

        const qRecords: DecisionQuestionEvalRecord[] = [];
        for (const decision of normalized.decisions) {
          const goldEntry = c.gold[decision.id];
          if (!goldEntry) continue;
          const qRec = DecisionsMetricsCalculator.evaluateQuestion(
            c.id,
            c.workflow || pack.shortName,
            c.displayText,
            decision,
            goldEntry,
            decideLatencyMs / Math.max(1, normalized.decisions.length)
          );
          qRecords.push(qRec);
        }

        // Check Option-Order Flip if orderStabilityGroup is present
        let orderFlipped: boolean | undefined;
        if (c.orderStabilityGroup && c.orderStabilityGroup.length >= 2) {
          const groupLabels = c.orderStabilityGroup
            .map((qid) => normalized.byId[qid]?.label?.toLowerCase()?.trim())
            .filter(Boolean);
          if (groupLabels.length >= 2) {
            orderFlipped = new Set(groupLabels).size > 1;
          }
        }

        const allCorrect = qRecords.length > 0 && qRecords.every((q) => q.correct);
        caseRecords.push({
          caseId: c.id,
          workflow: c.workflow || pack.shortName,
          displayText: c.displayText,
          latencyMs: decideLatencyMs,
          stateTokens,
          headTokens,
          allCorrect,
          orderFlipped,
          questions: qRecords,
        });

        this.progressCompleted = i + 1;
        const allQsSoFar = caseRecords.flatMap((cr) => cr.questions);
        if (allQsSoFar.length > 0) {
          this.liveAccuracy =
            allQsSoFar.reduce((s, q) => s + (q.correct ? 1 : 0), 0) / allQsSoFar.length;
        }
        const sortedLat = caseRecords.map((cr) => cr.latencyMs).sort((a, b) => a - b);
        this.liveLatencyP50Ms = DecisionsMetricsCalculator.percentile(sortedLat, 50);
        const totalInfMs = Math.max(1, sortedLat.reduce((a, b) => a + b, 0));
        this.liveDecisionsPerSec = (allQsSoFar.length / totalInfMs) * 1000;

        this.cdr.detectChanges();
      }
    } finally {
      for (const s of sessionBySchemaKey.values()) {
        try {
          s?.destroy?.();
        } catch {}
      }
    }

    const totalElapsedMs = Number((performance.now() - suiteStartMs).toFixed(1));
    const warmCreateMs =
      warmCreateTimes.length > 0
        ? warmCreateTimes.reduce((a, b) => a + b, 0) / warmCreateTimes.length
        : null;

    await this.refreshRuntimeStatus();
    const activeStatus = this.getExtensionModelStatus(this.selectedModelId);
    const catalogItem = this.getSelectedModelCatalogItem();
    const accelerator = activeStatus?.accelerator
      ? activeStatus.accelerator.toUpperCase()
      : this.isPolyfilled
        ? 'WebGPU / WASM'
        : 'Native';
    const runtimeLabel = this.isPolyfilled ? `Extension (${accelerator})` : 'Chrome Native';

    const defaultModelName = this.isPolyfilled
      ? catalogItem?.shortName || this.selectedModelId
      : 'Chrome Native DecisionModel';
    const customLabel = this.customRunLabel.trim();
    const displayModelName = customLabel || defaultModelName;

    return DecisionsMetricsCalculator.summarizeSuiteRun({
      suiteId: pack.id,
      suiteName: pack.name,
      modelId: this.isPolyfilled ? this.selectedModelId : 'chrome-native-decision-model',
      modelName: displayModelName,
      runtimeLabel,
      accelerator,
      sampleSize: casesToRun.length,
      coldCreateMs,
      warmCreateMs,
      totalElapsedMs,
      caseRecords,
    });
  }

  private async executeDecideWithQuotaFit(
    session: any,
    rawInput: string,
    signal: AbortSignal
  ): Promise<{ raw: any; decideLatencyMs: number; usedInput: string }> {
    let currentInput = rawInput;
    for (let attempt = 0; attempt < 6; attempt++) {
      signal.throwIfAborted();
      try {
        const t0 = performance.now();
        const raw =
          typeof session.decide === 'function'
            ? await session.decide(currentInput, { signal })
            : await session.classify(currentInput, { signal });
        const decideLatencyMs = Number((performance.now() - t0).toFixed(2));
        return { raw, decideLatencyMs, usedInput: currentInput };
      } catch (err: any) {
        const msg = String(err?.message || '');
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          msg.includes('leaves room for') ||
          msg.includes('QuotaExceededError');
        if (!isQuota || attempt === 5 || currentInput.length <= 24) {
          throw err;
        }
        const match = msg.match(/uses\s+(\d+)\s+tokens[\s\S]*?leaves room for\s+(\d+)/i);
        let ratio = 0.72;
        if (match) {
          const usedTokens = Math.max(1, Number(match[1]));
          const roomTokens = Math.max(8, Number(match[2]));
          ratio = Math.min(0.88, Math.max(0.25, (roomTokens - 3) / usedTokens));
        }
        const targetChars = Math.max(24, Math.floor(currentInput.length * ratio));
        currentInput = currentInput.slice(0, targetChars);
      }
    }
    throw new Error('Failed to fit input within model context window.');
  }

  getCombinedLeaderboard(): DecisionBenchmarkBaseline[] {
    if (!this.activePack) return [];
    const localRunsForSuite: DecisionBenchmarkBaseline[] = this.runHistory
      .filter((r) => r.suiteId === this.activePack!.id)
      .map((r) => ({
        id: r.runId,
        name: `${r.modelName}`,
        provider: `${r.runtimeLabel}`,
        accuracy: r.accuracy,
        macroF1: r.macroF1,
        brierScore: r.brierScore,
        nll: r.nll,
        ece: r.ece,
        meanConfidence: r.meanConfidence,
        coverageAt5PctRisk: r.coverageAt5PctRisk,
        scoreMae: r.scoreMae ?? undefined,
        flipRate: r.flipRate ?? undefined,
        latencyP50Ms: r.latencyP50Ms,
        source: `n=${r.sampleSize} cases`,
        isLocalRun: true,
        timestamp: r.timestamp,
        sampleSize: r.sampleSize,
      }));

    return [...localRunsForSuite, ...this.activePack.baselines].sort(
      (a, b) => b.accuracy - a.accuracy
    );
  }

  getSavedRunsForCurrentSuite(): DecisionBenchmarkSuiteRunResult[] {
    return this.runHistory.filter((r) => r.suiteId === this.selectedSuiteId);
  }

  selectSavedRun(runId: string): void {
    const found = this.runHistory.find((r) => r.runId === runId);
    if (found) {
      this.currentResult = found;
      this.expandedQuestionIndex = null;
      this.cdr.detectChanges();
    }
  }

  startRenameRun(runId: string, currentName: string, event?: Event): void {
    event?.stopPropagation();
    this.editingRunId = runId;
    this.editingRunName = currentName;
  }

  commitRenameRun(runId: string, event?: Event): void {
    event?.stopPropagation();
    const trimmed = this.editingRunName.trim();
    if (trimmed) {
      this.runHistory = this.runHistory.map((r) =>
        r.runId === runId ? { ...r, modelName: trimmed } : r
      );
      if (this.currentResult?.runId === runId) {
        this.currentResult = { ...this.currentResult, modelName: trimmed };
      }
      this.saveRunsToStorage();
    }
    this.editingRunId = null;
    this.editingRunName = '';
  }

  cancelRenameRun(event?: Event): void {
    event?.stopPropagation();
    this.editingRunId = null;
    this.editingRunName = '';
  }

  deleteSavedRun(runId: string, event?: Event): void {
    event?.stopPropagation();
    this.runHistory = this.runHistory.filter((r) => r.runId !== runId);
    if (this.currentResult?.runId === runId) {
      this.syncLatestResultForSuite(this.selectedSuiteId);
    }
    if (this.editingRunId === runId) {
      this.editingRunId = null;
    }
    this.saveRunsToStorage();
    this.cdr.detectChanges();
  }

  clearSavedRunsForCurrentSuite(): void {
    this.runHistory = this.runHistory.filter((r) => r.suiteId !== this.selectedSuiteId);
    this.currentResult = null;
    this.saveRunsToStorage();
    this.cdr.detectChanges();
  }

  clearAllSavedRuns(): void {
    this.runHistory = [];
    this.currentResult = null;
    if (this.isBrowser) {
      try {
        localStorage.removeItem(DecisionsBenchmarkPage.STORAGE_KEY_RUNS);
      } catch {}
    }
    this.cdr.detectChanges();
  }

  onPersistRunsToggleChange(enabled: boolean): void {
    this.persistRunsLocally = enabled;
    this.saveSettingsToStorage();
    if (enabled) {
      this.saveRunsToStorage();
    } else if (this.isBrowser) {
      try {
        localStorage.removeItem(DecisionsBenchmarkPage.STORAGE_KEY_RUNS);
      } catch {}
    }
  }

  private loadSavedStateFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      const rawSettings = localStorage.getItem(DecisionsBenchmarkPage.STORAGE_KEY_SETTINGS);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (typeof parsed.persistRunsLocally === 'boolean') {
          this.persistRunsLocally = parsed.persistRunsLocally;
        }
        if (typeof parsed.selectedSampleSize === 'number') {
          this.selectedSampleSize = parsed.selectedSampleSize;
        }
      }
      if (this.persistRunsLocally) {
        const rawRuns = localStorage.getItem(DecisionsBenchmarkPage.STORAGE_KEY_RUNS);
        if (rawRuns) {
          const runs = JSON.parse(rawRuns);
          if (Array.isArray(runs)) {
            this.runHistory = runs;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load saved benchmark runs from localStorage:', e);
    }
  }

  saveSettingsToStorage(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(
        DecisionsBenchmarkPage.STORAGE_KEY_SETTINGS,
        JSON.stringify({
          persistRunsLocally: this.persistRunsLocally,
          selectedSampleSize: this.selectedSampleSize,
        })
      );
    } catch {}
  }

  private saveRunsToStorage(): void {
    if (!this.isBrowser || !this.persistRunsLocally) return;
    try {
      localStorage.setItem(
        DecisionsBenchmarkPage.STORAGE_KEY_RUNS,
        JSON.stringify(this.runHistory)
      );
    } catch {
      // If localStorage quota is exceeded after many runs, keep full questionRecords for the
      // 12 most recent runs and keep summary + calibration bins for older runs.
      try {
        const compacted = this.runHistory.map((r, idx) =>
          idx < 12
            ? r
            : {
                ...r,
                caseRecords: [],
                questionRecords: [],
              }
        );
        localStorage.setItem(
          DecisionsBenchmarkPage.STORAGE_KEY_RUNS,
          JSON.stringify(compacted)
        );
      } catch (err) {
        console.warn('Could not persist runs to localStorage:', err);
      }
    }
  }

  formatRelativeTime(isoTimestamp?: string): string {
    if (!isoTimestamp) return '';
    const then = new Date(isoTimestamp).getTime();
    if (Number.isNaN(then)) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

    if (diffSec < 45) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return '1 hour ago';
    if (diffHr < 24) return `${diffHr} hours ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  getFilteredQuestions(): DecisionQuestionEvalRecord[] {
    if (!this.currentResult) return [];
    let list = this.currentResult.questionRecords;

    if (this.inspectorFilter === 'errors') {
      list = list.filter((q) => !q.correct);
    } else if (this.inspectorFilter === 'high_conf_errors') {
      list = list.filter((q) => !q.correct && q.topProbability >= 0.75);
    } else if (this.inspectorFilter === 'flipped') {
      const flippedCases = new Set(
        this.currentResult.caseRecords.filter((c) => c.orderFlipped).map((c) => c.caseId)
      );
      list = list.filter((q) => flippedCases.has(q.caseId));
    }

    const term = this.inspectorSearch.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (q) =>
          q.displayText.toLowerCase().includes(term) ||
          q.goldLabel.toLowerCase().includes(term) ||
          q.predictedLabel.toLowerCase().includes(term) ||
          q.questionId.toLowerCase().includes(term)
      );
    }
    return list;
  }

  toggleExpandQuestion(idx: number): void {
    this.expandedQuestionIndex = this.expandedQuestionIndex === idx ? null : idx;
  }

  exportCurrentReport(): void {
    if (!this.currentResult && this.runHistory.length === 0) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      currentResult: this.currentResult,
      runHistory: this.runHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisions-benchmark-${this.selectedSuiteId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  objectKeys(obj: Record<string, any> | undefined | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  hasSuiteRun(suiteId: string): boolean {
    return this.runHistory.some((r) => r.suiteId === suiteId);
  }
}
