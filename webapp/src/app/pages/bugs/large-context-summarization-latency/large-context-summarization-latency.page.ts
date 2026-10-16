import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { BasePage } from '../../base-page';
import {
  fitDocumentToInputQuota,
  LARGE_SUMMARIZATION_SYSTEM_PROMPT,
  LARGE_TECHNICAL_DOCUMENT_10K,
  LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT,
} from '../../cortex/axon/tests/shared/large-context-summarization.data';

declare const LanguageModel: any;
declare const Summarizer: any;

export type DocumentSizePreset = '2k' | '10k' | 'max-quota';
export type SystemPromptPreset = '3.6k' | 'minimal';
export type InspectorTab = 'code' | 'document' | 'system-prompt' | 'config';
export type RunPatternId =
  | 'prompt-parallel'
  | 'prompt-cloned'
  | 'summarizer-api';

export interface SummarizationTimingRun {
  id: RunPatternId;
  label: string;
  shortLabel: string;
  subtitle: string;
  status: 'pending' | 'running' | 'done' | 'error';
  phase: 'idle' | 'creating' | 'prefilling' | 'decoding' | 'done' | 'error';
  createMs: number | null;
  firstChunkMs: number | null;
  decodeMs: number | null;
  streamingMs: number | null;
  totalEndToEndMs: number | null;
  maxGapMs: number | null;
  chunks: number;
  inputChars: number;
  systemPromptChars: number;
  inputTokens: number | null;
  inputQuota: number | null;
  outputChars: number;
  prefillTokensPerSec: number | null;
  decodeChunksPerSec: number | null;
  outputPreview: string;
  errorMessage?: string;
}

@Component({
  selector: 'app-large-context-summarization-latency-page',
  templateUrl: './large-context-summarization-latency.page.html',
  styleUrls: ['./large-context-summarization-latency.page.scss'],
  standalone: false,
})
export class LargeContextSummarizationLatencyPage
  extends BasePage
  implements OnInit, OnDestroy
{
  documentPreset: DocumentSizePreset = '10k';
  systemPromptPreset: SystemPromptPreset = '3.6k';

  showReproCode = false;
  activeInspectorTab: InspectorTab = 'code';
  selectedRunId: RunPatternId = 'prompt-parallel';

  inspectorHeight = 320;
  private isResizingInspector = false;
  private resizeStartY = 0;
  private resizeStartHeight = 320;

  documentText = LARGE_TECHNICAL_DOCUMENT_10K;
  systemPromptText = LARGE_SUMMARIZATION_SYSTEM_PROMPT;

  copiedKey: string | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  testRunning = false;
  activeAbortController: AbortController | null = null;

  runs: SummarizationTimingRun[] = [];

  readonly minimalSystemPrompt =
    'Summarize the provided technical document into concise bullet points highlighting key metrics and recommendations.';

  constructor(title: Title, @Inject(DOCUMENT) document: Document) {
    super(document, title);
    this.setTitle(
      'Bug: Large-Context Summarization Prefill & TTFT Latency'
    );
    this.syncInputsFromPresets();
    this.resetRuns();
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  override ngOnDestroy(): void {
    this.stopTest();
    if (this.copyTimer) {
      clearTimeout(this.copyTimer);
    }
    super.ngOnDestroy();
  }

  startInspectorResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingInspector = true;
    this.resizeStartY = event.clientY;
    this.resizeStartHeight = this.inspectorHeight;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (!this.isResizingInspector) return;
    const delta = event.clientY - this.resizeStartY;
    this.inspectorHeight = Math.max(
      180,
      Math.min(800, this.resizeStartHeight + delta)
    );
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    if (!this.isResizingInspector) return;
    this.isResizingInspector = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  get selectedRun(): SummarizationTimingRun | undefined {
    return this.runs.find((r) => r.id === this.selectedRunId) || this.runs[0];
  }

  get estimatedDocumentTokens(): number {
    return Math.round((this.documentText?.length || 0) / 4.2);
  }

  get estimatedSystemTokens(): number {
    return Math.round((this.systemPromptText?.length || 0) / 4.2);
  }

  syncInputsFromPresets(): void {
    if (this.documentPreset === '2k') {
      this.documentText = LARGE_TECHNICAL_DOCUMENT_10K.slice(0, 2100).trim();
    } else if (this.documentPreset === '10k') {
      this.documentText = LARGE_TECHNICAL_DOCUMENT_10K;
    } else {
      this.documentText = LARGE_TECHNICAL_DOCUMENT_MAX_CONTEXT;
    }

    this.systemPromptText =
      this.systemPromptPreset === '3.6k'
        ? LARGE_SUMMARIZATION_SYSTEM_PROMPT
        : this.minimalSystemPrompt;
  }

  onPresetChange(): void {
    this.syncInputsFromPresets();
    if (!this.testRunning) {
      this.resetRuns();
    }
  }

  onCustomInputEdited(): void {
    if (!this.testRunning) {
      for (const run of this.runs) {
        run.inputChars = this.documentText.length;
        run.systemPromptChars =
          run.id === 'summarizer-api' ? 0 : this.systemPromptText.length;
      }
    }
  }

  selectRun(runId: RunPatternId): void {
    this.selectedRunId = runId;
  }

  resetRuns(): void {
    const sysLen = this.systemPromptText.length;
    const docLen = this.documentText.length;

    this.runs = [
      {
        id: 'prompt-parallel',
        label: '1. Prompt API (Fresh Session + System Prompt + Document)',
        shortLabel: 'Pattern 1: Prompt API (Fresh)',
        subtitle:
          'LanguageModel.create({ initialPrompts }) in parallel with text extraction, then session.promptStreaming(doc)',
        status: 'pending',
        phase: 'idle',
        createMs: null,
        firstChunkMs: null,
        decodeMs: null,
        streamingMs: null,
        totalEndToEndMs: null,
        maxGapMs: null,
        chunks: 0,
        inputChars: docLen,
        systemPromptChars: sysLen,
        inputTokens: null,
        inputQuota: null,
        outputChars: 0,
        prefillTokensPerSec: null,
        decodeChunksPerSec: null,
        outputPreview: '',
      },
      {
        id: 'prompt-cloned',
        label: '2. Prompt API (Warm Cloned Session — System Prompt Cached)',
        shortLabel: 'Pattern 2: Prompt API (Cloned)',
        subtitle:
          'Clones a pre-initialized session so the ~3.6k system prompt is not re-prefilled on each document',
        status: 'pending',
        phase: 'idle',
        createMs: null,
        firstChunkMs: null,
        decodeMs: null,
        streamingMs: null,
        totalEndToEndMs: null,
        maxGapMs: null,
        chunks: 0,
        inputChars: docLen,
        systemPromptChars: sysLen,
        inputTokens: null,
        inputQuota: null,
        outputChars: 0,
        prefillTokensPerSec: null,
        decodeChunksPerSec: null,
        outputPreview: '',
      },
      {
        id: 'summarizer-api',
        label: '3. Built-in Summarizer API (summarizeStreaming)',
        shortLabel: 'Pattern 3: Summarizer API',
        subtitle:
          'Summarizer.create({ type: "key-points", length: "medium" }) + summarizer.summarizeStreaming(doc)',
        status: 'pending',
        phase: 'idle',
        createMs: null,
        firstChunkMs: null,
        decodeMs: null,
        streamingMs: null,
        totalEndToEndMs: null,
        maxGapMs: null,
        chunks: 0,
        inputChars: docLen,
        systemPromptChars: 0,
        inputTokens: null,
        inputQuota: null,
        outputChars: 0,
        prefillTokensPerSec: null,
        decodeChunksPerSec: null,
        outputPreview: '',
      },
    ];
  }

  getCodeSnippet(patternId: RunPatternId, _includeFullStrings = true): string {
    const toTemplateLiteral = (text: string): string =>
      `\`${text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;

    const sysLiteral = toTemplateLiteral(this.systemPromptText);
    const docLiteral = toTemplateLiteral(this.documentText);

    if (patternId === 'prompt-parallel') {
      return `const SYSTEM_PROMPT = ${sysLiteral};

const DOCUMENT_TEXT = ${docLiteral};

const extractDocumentText = async () => DOCUMENT_TEXT;

async function summarize() {
  const abortController = new AbortController();
  const { signal } = abortController;
  const timings = {};

  // Session creation and text extraction start together
  const createStart = performance.now();
  const sessionPromise = LanguageModel.create({
    signal,
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
  }).finally(() => {
    timings.create_ms = Math.round(performance.now() - createStart);
  });

  const [documentText, session] = await Promise.all([
    extractDocumentText(),
    sessionPromise,
  ]);

  try {
    const promptStart = performance.now();
    let lastChunkAt = promptStart;
    let summary = "";
    timings.chunks = 0;
    timings.max_gap_ms = 0;

    for await (const chunk of session.promptStreaming(documentText, { signal })) {
      const now = performance.now();
      if (timings.chunks === 0) {
        timings.first_chunk_ms = Math.round(now - promptStart);
      } else {
        timings.max_gap_ms = Math.max(timings.max_gap_ms, Math.round(now - lastChunkAt));
      }
      lastChunkAt = now;
      timings.chunks++;
      summary += chunk;
    }

    timings.streaming_ms = Math.round(performance.now() - promptStart);
    timings.input_chars = documentText.length;
    timings.output_chars = summary.length;
    console.table(timings);
    return { summary, timings };
  } finally {
    session.destroy();
  }
}

await summarize();`;
    }

    if (patternId === 'prompt-cloned') {
      return `const SYSTEM_PROMPT = ${sysLiteral};
const DOCUMENT_TEXT = ${docLiteral};

// 1. Pre-warm a parent session once with the ~3.6k system prompt
const baseSession = await LanguageModel.create({
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
  initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
});

async function summarizeWithClonedSession(documentText) {
  const timings = {};
  const cloneStart = performance.now();
  const session = await baseSession.clone();
  timings.create_ms = Math.round(performance.now() - cloneStart);

  try {
    const promptStart = performance.now();
    let lastChunkAt = promptStart;
    let summary = "";
    timings.chunks = 0;
    timings.max_gap_ms = 0;

    for await (const chunk of session.promptStreaming(documentText)) {
      const now = performance.now();
      if (timings.chunks === 0) {
        timings.first_chunk_ms = Math.round(now - promptStart);
      } else {
        timings.max_gap_ms = Math.max(timings.max_gap_ms, Math.round(now - lastChunkAt));
      }
      lastChunkAt = now;
      timings.chunks++;
      summary += chunk;
    }

    timings.streaming_ms = Math.round(performance.now() - promptStart);
    timings.input_chars = documentText.length;
    timings.output_chars = summary.length;
    console.table(timings);
    return { summary, timings };
  } finally {
    session.destroy();
  }
}

await summarizeWithClonedSession(DOCUMENT_TEXT);`;
    }

    return `const DOCUMENT_TEXT = ${docLiteral};

async function summarizeWithSummarizerApi(documentText) {
  const timings = {};
  const createStart = performance.now();
  const summarizer = await Summarizer.create({
    type: "key-points",
    format: "plain-text",
    length: "medium",
    expectedInputLanguages: ["en"],
    outputLanguage: "en",
  });
  timings.create_ms = Math.round(performance.now() - createStart);
  timings.input_quota = summarizer.inputQuota;

  try {
    const promptStart = performance.now();
    let lastChunkAt = promptStart;
    let summary = "";
    timings.chunks = 0;
    timings.max_gap_ms = 0;

    for await (const chunk of summarizer.summarizeStreaming(documentText)) {
      const now = performance.now();
      if (timings.chunks === 0) {
        timings.first_chunk_ms = Math.round(now - promptStart);
      } else {
        timings.max_gap_ms = Math.max(timings.max_gap_ms, Math.round(now - lastChunkAt));
      }
      lastChunkAt = now;
      timings.chunks++;
      summary += chunk;
    }

    timings.streaming_ms = Math.round(performance.now() - promptStart);
    timings.input_chars = documentText.length;
    timings.output_chars = summary.length;
    console.table(timings);
    return { summary, timings };
  } finally {
    summarizer.destroy();
  }
}

await summarizeWithSummarizerApi(DOCUMENT_TEXT);`;
  }

  getInspectorConfigJson(): string {
    const run = this.selectedRun;
    const payload = {
      pattern: run?.id,
      createOptions:
        run?.id === 'summarizer-api'
          ? {
              type: 'key-points',
              format: 'plain-text',
              length: 'medium',
              expectedInputLanguages: ['en'],
              outputLanguage: 'en',
            }
          : {
              expectedInputs: [{ type: 'text', languages: ['en'] }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
              initialPrompts: [
                {
                  role: 'system',
                  content: `<${this.systemPromptText.length} chars>`,
                },
              ],
            },
      payloadStats: {
        systemPromptChars:
          run?.id === 'summarizer-api' ? 0 : this.systemPromptText.length,
        documentChars: run?.inputChars ?? this.documentText.length,
        measuredInputTokens: run?.inputTokens ?? null,
        sessionInputQuota: run?.inputQuota ?? null,
      },
      timings: {
        create_ms: run?.createMs ?? null,
        first_chunk_ms: run?.firstChunkMs ?? null,
        decode_ms: run?.decodeMs ?? null,
        streaming_ms: run?.streamingMs ?? null,
        max_gap_ms: run?.maxGapMs ?? null,
        chunks: run?.chunks ?? 0,
        prefill_tok_per_sec: run?.prefillTokensPerSec ?? null,
        decode_chunks_per_sec: run?.decodeChunksPerSec ?? null,
        input_chars: run?.inputChars ?? this.documentText.length,
        output_chars: run?.outputChars ?? 0,
      },
    };
    return JSON.stringify(payload, null, 2);
  }

  async copyText(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedKey = key;
      if (this.copyTimer) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => {
        this.copiedKey = null;
      }, 2000);
    } catch {
      // Ignore clipboard failures
    }
  }

  stopTest(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.testRunning = false;
  }

  async runAllTests(): Promise<void> {
    if (this.testRunning) return;
    this.testRunning = true;
    this.resetRuns();
    this.activeAbortController = new AbortController();
    const { signal } = this.activeAbortController;

    try {
      await this.executePromptParallelRun(this.runs[0], signal);
      if (signal.aborted) return;
      await this.executePromptClonedRun(this.runs[1], signal);
      if (signal.aborted) return;
      await this.executeSummarizerRun(this.runs[2], signal);
    } finally {
      this.testRunning = false;
      this.activeAbortController = null;
    }
  }

  async runSingle(runId: RunPatternId): Promise<void> {
    if (this.testRunning) return;
    this.testRunning = true;
    this.selectedRunId = runId;
    this.activeAbortController = new AbortController();
    const { signal } = this.activeAbortController;

    const target = this.runs.find((r) => r.id === runId);
    if (!target) {
      this.testRunning = false;
      return;
    }

    this.resetSingleRunState(target);

    try {
      if (runId === 'prompt-parallel') {
        await this.executePromptParallelRun(target, signal);
      } else if (runId === 'prompt-cloned') {
        await this.executePromptClonedRun(target, signal);
      } else {
        await this.executeSummarizerRun(target, signal);
      }
    } finally {
      this.testRunning = false;
      this.activeAbortController = null;
    }
  }

  private resetSingleRunState(run: SummarizationTimingRun): void {
    run.status = 'pending';
    run.phase = 'idle';
    run.createMs = null;
    run.firstChunkMs = null;
    run.decodeMs = null;
    run.streamingMs = null;
    run.totalEndToEndMs = null;
    run.maxGapMs = null;
    run.chunks = 0;
    run.inputChars = this.documentText.length;
    run.systemPromptChars =
      run.id === 'summarizer-api' ? 0 : this.systemPromptText.length;
    run.inputTokens = null;
    run.inputQuota = null;
    run.outputChars = 0;
    run.prefillTokensPerSec = null;
    run.decodeChunksPerSec = null;
    run.outputPreview = '';
    run.errorMessage = undefined;
  }

  private async resolveDocumentForInstance(
    instance: any,
    systemPromptChars = 0
  ): Promise<{
    text: string;
    measuredTokens: number | null;
    quota: number | null;
  }> {
    const quota: number | null =
      typeof instance?.inputQuota === 'number' && instance.inputQuota > 0
        ? instance.inputQuota
        : null;

    if (this.documentPreset === 'max-quota') {
      const ratio = systemPromptChars > 0 ? 0.72 : 0.85;
      const fitted = await fitDocumentToInputQuota(instance, ratio);
      this.documentText = fitted.text;
      return {
        text: fitted.text,
        measuredTokens: fitted.measuredTokens,
        quota: fitted.inputQuota ?? quota,
      };
    }

    const text = this.documentText;
    const measuredTokens = await this.measureTokensSafe(instance, text);
    return { text, measuredTokens, quota };
  }

  private async measureTokensSafe(
    instance: any,
    text: string
  ): Promise<number | null> {
    try {
      if (typeof instance?.measureInputUsage === 'function') {
        return Number(await instance.measureInputUsage(text));
      }
      if (typeof instance?.measureContextUsage === 'function') {
        return Number(await instance.measureContextUsage(text));
      }
    } catch {
      // Ignore measurement errors
    }
    return Math.round(text.length / 4);
  }

  private async executePromptParallelRun(
    run: SummarizationTimingRun,
    signal: AbortSignal
  ): Promise<void> {
    this.selectedRunId = run.id;
    run.status = 'running';
    run.phase = 'creating';
    let session: any = null;

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error('LanguageModel API is not available in this browser.');
      }

      const systemPrompt = this.systemPromptText;
      run.systemPromptChars = systemPrompt.length;

      const endToEndStart = performance.now();
      const createStart = performance.now();

      const sessionPromise = LanguageModel.create({
        signal,
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        initialPrompts: [{ role: 'system', content: systemPrompt }],
      }).finally(() => {
        run.createMs = Math.round(performance.now() - createStart);
      });

      session = await sessionPromise;

      const resolved = await this.resolveDocumentForInstance(
        session,
        systemPrompt.length
      );
      const documentText = resolved.text;
      run.inputChars = documentText.length;
      run.inputQuota = resolved.quota;

      const totalTokens = await this.measureTokensSafe(
        session,
        `${systemPrompt}\n\n${documentText}`
      );
      run.inputTokens = totalTokens;

      run.phase = 'prefilling';
      const promptStart = performance.now();
      let lastChunkAt = promptStart;
      let summary = '';
      run.chunks = 0;
      run.maxGapMs = 0;

      for await (const chunk of session.promptStreaming(documentText, {
        signal,
      })) {
        const now = performance.now();
        if (run.chunks === 0) {
          run.firstChunkMs = Math.round(now - promptStart);
          run.phase = 'decoding';
          if (run.firstChunkMs > 0 && run.inputTokens) {
            run.prefillTokensPerSec =
              Math.round((run.inputTokens / (run.firstChunkMs / 1000)) * 10) /
              10;
          }
        } else {
          run.maxGapMs = Math.max(
            run.maxGapMs || 0,
            Math.round(now - lastChunkAt)
          );
        }
        lastChunkAt = now;
        run.chunks++;
        summary += chunk;
        run.outputPreview = summary;
        run.outputChars = summary.length;
      }

      run.streamingMs = Math.round(performance.now() - promptStart);
      run.decodeMs = Math.max(0, run.streamingMs - (run.firstChunkMs || 0));
      run.totalEndToEndMs = Math.round(performance.now() - endToEndStart);

      if (run.decodeMs > 0 && run.chunks > 1) {
        run.decodeChunksPerSec =
          Math.round(((run.chunks - 1) / (run.decodeMs / 1000)) * 10) / 10;
      }

      run.phase = 'done';
      run.status = 'done';
    } catch (e: any) {
      if (signal.aborted) {
        run.status = 'pending';
        run.phase = 'idle';
        return;
      }
      run.status = 'error';
      run.phase = 'error';
      run.errorMessage = e?.message || 'Execution failed';
    } finally {
      if (session && typeof session.destroy === 'function') {
        try {
          session.destroy();
        } catch {}
      }
    }
  }

  private async executePromptClonedRun(
    run: SummarizationTimingRun,
    signal: AbortSignal
  ): Promise<void> {
    this.selectedRunId = run.id;
    run.status = 'running';
    run.phase = 'creating';
    let baseSession: any = null;
    let clonedSession: any = null;

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error('LanguageModel API is not available in this browser.');
      }

      const systemPrompt = this.systemPromptText;
      run.systemPromptChars = systemPrompt.length;

      baseSession = await LanguageModel.create({
        signal,
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        initialPrompts: [{ role: 'system', content: systemPrompt }],
      });

      const resolved = await this.resolveDocumentForInstance(
        baseSession,
        systemPrompt.length
      );
      const documentText = resolved.text;
      run.inputChars = documentText.length;
      run.inputQuota = resolved.quota;
      run.inputTokens = resolved.measuredTokens;

      const endToEndStart = performance.now();
      const cloneStart = performance.now();

      clonedSession =
        typeof baseSession.clone === 'function'
          ? await baseSession.clone({ signal })
          : baseSession;

      run.createMs = Math.round(performance.now() - cloneStart);
      run.phase = 'prefilling';

      const promptStart = performance.now();
      let lastChunkAt = promptStart;
      let summary = '';
      run.chunks = 0;
      run.maxGapMs = 0;

      for await (const chunk of clonedSession.promptStreaming(documentText, {
        signal,
      })) {
        const now = performance.now();
        if (run.chunks === 0) {
          run.firstChunkMs = Math.round(now - promptStart);
          run.phase = 'decoding';
          if (run.firstChunkMs > 0 && run.inputTokens) {
            run.prefillTokensPerSec =
              Math.round((run.inputTokens / (run.firstChunkMs / 1000)) * 10) /
              10;
          }
        } else {
          run.maxGapMs = Math.max(
            run.maxGapMs || 0,
            Math.round(now - lastChunkAt)
          );
        }
        lastChunkAt = now;
        run.chunks++;
        summary += chunk;
        run.outputPreview = summary;
        run.outputChars = summary.length;
      }

      run.streamingMs = Math.round(performance.now() - promptStart);
      run.decodeMs = Math.max(0, run.streamingMs - (run.firstChunkMs || 0));
      run.totalEndToEndMs = Math.round(performance.now() - endToEndStart);

      if (run.decodeMs > 0 && run.chunks > 1) {
        run.decodeChunksPerSec =
          Math.round(((run.chunks - 1) / (run.decodeMs / 1000)) * 10) / 10;
      }

      run.phase = 'done';
      run.status = 'done';
    } catch (e: any) {
      if (signal.aborted) {
        run.status = 'pending';
        run.phase = 'idle';
        return;
      }
      run.status = 'error';
      run.phase = 'error';
      run.errorMessage = e?.message || 'Execution failed';
    } finally {
      if (
        clonedSession &&
        clonedSession !== baseSession &&
        typeof clonedSession.destroy === 'function'
      ) {
        try {
          clonedSession.destroy();
        } catch {}
      }
      if (baseSession && typeof baseSession.destroy === 'function') {
        try {
          baseSession.destroy();
        } catch {}
      }
    }
  }

  private async executeSummarizerRun(
    run: SummarizationTimingRun,
    signal: AbortSignal
  ): Promise<void> {
    this.selectedRunId = run.id;
    run.status = 'running';
    run.phase = 'creating';
    let summarizer: any = null;

    try {
      if (typeof Summarizer === 'undefined') {
        throw new Error('Summarizer API is not available in this browser.');
      }

      const createStart = performance.now();

      summarizer = await Summarizer.create({
        signal,
        type: 'key-points',
        format: 'plain-text',
        length: 'medium',
        expectedInputLanguages: ['en'],
        outputLanguage: 'en',
      });

      run.createMs = Math.round(performance.now() - createStart);

      const resolved = await this.resolveDocumentForInstance(summarizer, 0);
      const documentText = resolved.text;
      run.inputChars = documentText.length;
      run.inputQuota = resolved.quota;
      run.inputTokens = resolved.measuredTokens;

      run.phase = 'prefilling';
      const promptStart = performance.now();
      let lastChunkAt = promptStart;
      let summary = '';
      run.chunks = 0;
      run.maxGapMs = 0;

      for await (const chunk of summarizer.summarizeStreaming(documentText, {
        signal,
      })) {
        const now = performance.now();
        if (run.chunks === 0) {
          run.firstChunkMs = Math.round(now - promptStart);
          run.phase = 'decoding';
          if (run.firstChunkMs > 0 && run.inputTokens) {
            run.prefillTokensPerSec =
              Math.round((run.inputTokens / (run.firstChunkMs / 1000)) * 10) /
              10;
          }
        } else {
          run.maxGapMs = Math.max(
            run.maxGapMs || 0,
            Math.round(now - lastChunkAt)
          );
        }
        lastChunkAt = now;
        run.chunks++;
        summary += chunk;
        run.outputPreview = summary;
        run.outputChars = summary.length;
      }

      run.streamingMs = Math.round(performance.now() - promptStart);
      run.decodeMs = Math.max(0, run.streamingMs - (run.firstChunkMs || 0));
      run.totalEndToEndMs = (run.createMs || 0) + (run.streamingMs || 0);

      if (run.decodeMs > 0 && run.chunks > 1) {
        run.decodeChunksPerSec =
          Math.round(((run.chunks - 1) / (run.decodeMs / 1000)) * 10) / 10;
      }

      run.phase = 'done';
      run.status = 'done';
    } catch (e: any) {
      if (signal.aborted) {
        run.status = 'pending';
        run.phase = 'idle';
        return;
      }
      run.status = 'error';
      run.phase = 'error';
      run.errorMessage = e?.message || 'Execution failed';
    } finally {
      if (summarizer && typeof summarizer.destroy === 'function') {
        try {
          summarizer.destroy();
        } catch {}
      }
    }
  }
}
