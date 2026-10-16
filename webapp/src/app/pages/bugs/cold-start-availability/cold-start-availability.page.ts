import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BasePage } from '../../base-page';

export type ProbeStatus =
  | 'WAITING'
  | 'PENDING'
  | 'RESOLVED'
  | 'HUNG'
  | 'REJECTED'
  | 'UNEXPOSED';

export interface ProbeApiDefinition {
  id: string;
  label: string;
  targetOfBug: boolean;
  call: () => Promise<any> | null;
}

export interface ProbeRecord {
  api: ProbeApiDefinition;
  status: ProbeStatus;
  startTime: number;
  settled: boolean;
  missing: boolean;
  result: string;
  latencyText: string;
}

export interface TimelineLogEntry {
  id: number;
  timestampMs: number;
  message: string;
  level: 'normal' | 'highlight' | 'error';
}

@Component({
  selector: 'app-cold-start-availability-page',
  templateUrl: './cold-start-availability.page.html',
  styleUrls: ['./cold-start-availability.page.scss'],
  standalone: false,
})
export class ColdStartAvailabilityPage
  extends BasePage
  implements OnInit, OnDestroy
{
  readonly wave2DelayMs = 4000;
  readonly hungThresholdMs = 5000;

  t0 = 0;
  private wave2TimerId: ReturnType<typeof setTimeout> | null = null;
  private statusIntervalId: ReturnType<typeof setInterval> | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;
  private nextLogId = 1;

  copiedKey: string | null = null;

  wave1Records: ProbeRecord[] = [];
  wave2Records: ProbeRecord[] = [];
  wave2Started = false;

  verdictState: 'running' | 'pass' | 'fail' = 'running';
  verdictText = 'Running cold-start probe...';
  elapsedClockText = 't = 0.0s';
  wave1SummaryText = '0 / 0 settled';
  wave2SummaryText = 'Scheduled in 4.0s';
  logs: TimelineLogEntry[] = [];

  readonly standaloneReproScript = `// Built-In AI availability() Cold-Start Reproducer
const APIS = [
  ["Summarizer", () => globalThis.Summarizer?.availability()],
  ["LanguageModel", () => globalThis.LanguageModel?.availability()],
  ["Writer", () => globalThis.Writer?.availability()],
  ["Rewriter", () => globalThis.Rewriter?.availability()],
  ["Proofreader", () => globalThis.Proofreader?.availability()],
  ["LanguageDetector [control]", () => globalThis.LanguageDetector?.availability()],
  ["Translator [control]", () => globalThis.Translator?.availability({ sourceLanguage: "en", targetLanguage: "es" })],
];

function runWave(waveName) {
  for (const [name, fn] of APIS) {
    const start = performance.now();
    const p = fn();
    if (!p) {
      console.log(\`[\${waveName}] \${name}: UNEXPOSED\`);
      continue;
    }
    p.then(
      res => console.log(\`[\${waveName}] \${name} resolved -> "\${res}" in \${Math.round(performance.now() - start)}ms\`),
      err => console.error(\`[\${waveName}] \${name} rejected ->\`, err)
    );
  }
}

// Wave 1 at t = 0ms, Wave 2 at t = +4000ms
runWave("Wave 1 (0ms)");
setTimeout(() => runWave("Wave 2 (+4000ms)"), 4000);`;

  readonly apis: ProbeApiDefinition[] = [
    {
      id: 'Summarizer',
      label: 'Summarizer.availability()',
      targetOfBug: true,
      call: () => {
        const api = (globalThis as any).Summarizer;
        return typeof api?.availability === 'function'
          ? api.availability()
          : null;
      },
    },
    {
      id: 'LanguageModel',
      label: 'LanguageModel.availability()',
      targetOfBug: true,
      call: () => {
        const api = (globalThis as any).LanguageModel;
        return typeof api?.availability === 'function'
          ? api.availability()
          : null;
      },
    },
    {
      id: 'Writer',
      label: 'Writer.availability()',
      targetOfBug: true,
      call: () => {
        const api = (globalThis as any).Writer;
        return typeof api?.availability === 'function'
          ? api.availability()
          : null;
      },
    },
    {
      id: 'Rewriter',
      label: 'Rewriter.availability()',
      targetOfBug: true,
      call: () => {
        const api = (globalThis as any).Rewriter;
        return typeof api?.availability === 'function'
          ? api.availability()
          : null;
      },
    },
    {
      id: 'Proofreader',
      label: 'Proofreader.availability()',
      targetOfBug: true,
      call: () => {
        const api = (globalThis as any).Proofreader;
        return typeof api?.availability === 'function'
          ? api.availability()
          : null;
      },
    },
    {
      id: 'LanguageDetector',
      label: 'LanguageDetector.availability() [control]',
      targetOfBug: false,
      call: () => {
        const api = (globalThis as any).LanguageDetector;
        return typeof api?.availability === 'function'
          ? api.availability()
          : null;
      },
    },
    {
      id: 'Translator',
      label: 'Translator.availability() [control]',
      targetOfBug: false,
      call: () => {
        const api = (globalThis as any).Translator;
        return typeof api?.availability === 'function'
          ? api.availability({ sourceLanguage: 'en', targetLanguage: 'es' })
          : null;
      },
    },
  ];

  constructor(
    title: Title,
    @Inject(DOCUMENT) document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    super(document, title);
    this.setTitle('Bug: Built-In AI availability() Cold-Start Reproducer');
    this.wave1Records = this.createPlaceholderRecords();
    this.wave2Records = this.createPlaceholderRecords();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (isPlatformBrowser(this.platformId)) {
      this.startProbeSequence();
    }
  }

  override ngOnDestroy(): void {
    this.clearTimers();
    if (this.copyTimer) {
      clearTimeout(this.copyTimer);
    }
    super.ngOnDestroy();
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

  getFormattedLogs(): string {
    return this.logs
      .map((entry) => `[+${entry.timestampMs}ms] ${entry.message}`)
      .join('\n');
  }

  private clearTimers(): void {
    if (this.wave2TimerId !== null) {
      clearTimeout(this.wave2TimerId);
      this.wave2TimerId = null;
    }
    if (this.statusIntervalId !== null) {
      clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }
  }

  startProbeSequence(): void {
    this.clearTimers();
    this.logs = [];
    this.wave2Started = false;
    this.verdictState = 'running';
    this.verdictText = 'Running cold-start probe...';
    this.elapsedClockText = 't = 0.0s';
    this.wave1Records = this.createPlaceholderRecords();
    this.wave2Records = this.createPlaceholderRecords();

    this.t0 = performance.now();
    this.runWave('Wave 1', this.wave1Records);

    this.wave2TimerId = setTimeout(() => {
      this.startWave2('scheduled +4000ms timer');
    }, this.wave2DelayMs);

    this.statusIntervalId = setInterval(() => {
      this.updateAllStatuses();
    }, 100);
  }

  fireWave2Manual(): void {
    this.startWave2('manual button click');
  }

  fireExtraProbe(): void {
    this.logEvent(
      'Running extra on-demand probe across target Built-In AI APIs...'
    );
    for (const api of this.apis) {
      if (!api.targetOfBug) continue;
      const start = performance.now();
      try {
        const promise = api.call();
        if (promise) {
          promise.then(
            (res) => {
              const latency = Math.round(performance.now() - start);
              this.logEvent(
                `[Extra Probe] ${api.id}.availability() -> "${res}" in ${latency}ms`,
                'highlight'
              );
            },
            (err) => {
              const latency = Math.round(performance.now() - start);
              this.logEvent(
                `[Extra Probe] ${api.id}.availability() rejected -> ${err} in ${latency}ms`,
                'error'
              );
            }
          );
        } else {
          this.logEvent(
            `[Extra Probe] ${api.id} is not exposed in this browser.`,
            'normal'
          );
        }
      } catch (err) {
        this.logEvent(
          `[Extra Probe] ${api.id}.availability() error: ${err}`,
          'error'
        );
      }
    }
  }

  private createPlaceholderRecords(): ProbeRecord[] {
    return this.apis.map((api) => ({
      api,
      status: 'WAITING',
      startTime: 0,
      settled: false,
      missing: false,
      result: '—',
      latencyText: '—',
    }));
  }

  private nowMs(): number {
    return Math.max(0, Math.round(performance.now() - this.t0));
  }

  private logEvent(
    message: string,
    level: 'normal' | 'highlight' | 'error' = 'normal'
  ): void {
    this.logs.push({
      id: this.nextLogId++,
      timestampMs: this.nowMs(),
      message,
      level,
    });
  }

  private startWave2(reason: string): void {
    if (this.wave2TimerId !== null) {
      clearTimeout(this.wave2TimerId);
      this.wave2TimerId = null;
    }
    this.wave2Started = true;
    this.logEvent(`Triggering Wave 2 (${reason}).`, 'highlight');
    this.runWave('Wave 2', this.wave2Records);
  }

  private runWave(waveName: string, records: ProbeRecord[]): void {
    records.length = 0;
    for (const api of this.apis) {
      const startTime = performance.now();
      const record: ProbeRecord = {
        api,
        status: 'PENDING',
        startTime,
        settled: false,
        missing: false,
        result: '—',
        latencyText: '0ms (waiting...)',
      };
      records.push(record);

      let promise: Promise<any> | null = null;
      try {
        promise = api.call();
      } catch (err) {
        record.settled = true;
        record.status = 'REJECTED';
        record.result = String(err);
        record.latencyText = '0ms';
        this.logEvent(
          `${waveName} ${api.id}.availability() threw synchronously: ${record.result}`,
          'error'
        );
        continue;
      }

      if (!promise) {
        record.settled = true;
        record.missing = true;
        record.status = 'UNEXPOSED';
        record.result = 'API not enabled';
        record.latencyText = '—';
        continue;
      }

      promise.then(
        (res) => {
          const latency = Math.round(performance.now() - startTime);
          record.settled = true;
          record.status = 'RESOLVED';
          record.result = `"${String(res)}"`;
          record.latencyText = `${latency}ms`;
          this.logEvent(
            `${waveName} ${api.id}.availability() resolved -> "${String(res)}" in ${latency}ms`,
            'highlight'
          );
          this.updateAllStatuses();
        },
        (err) => {
          const latency = Math.round(performance.now() - startTime);
          record.settled = true;
          record.status = 'REJECTED';
          record.result = String(err);
          record.latencyText = `${latency}ms`;
          this.logEvent(
            `${waveName} ${api.id}.availability() rejected -> ${record.result} in ${latency}ms`,
            'error'
          );
          this.updateAllStatuses();
        }
      );
    }

    this.logEvent(
      `Started ${waveName} (${this.apis.length} availability probes).`
    );
    this.updateAllStatuses();
  }

  private formatWaveSummary(records: ProbeRecord[]): string {
    const exposed = records.filter((r) => !r.missing);
    const settled = exposed.filter((r) => r.settled);
    return `${settled.length} / ${exposed.length} settled`;
  }

  private updateAllStatuses(): void {
    const now = performance.now();
    const elapsedSec = ((now - this.t0) / 1000).toFixed(1);
    this.elapsedClockText = `t = ${elapsedSec}s`;

    for (const wave of [this.wave1Records, this.wave2Records]) {
      for (const rec of wave) {
        if (!rec.settled && !rec.missing && rec.status !== 'WAITING') {
          const elapsedMs = Math.round(now - rec.startTime);
          rec.latencyText = `${elapsedMs}ms (waiting...)`;
          if (elapsedMs >= this.hungThresholdMs) {
            rec.status = 'HUNG';
          }
        }
      }
    }

    this.wave1SummaryText = this.formatWaveSummary(this.wave1Records);
    if (this.wave2Started) {
      this.wave2SummaryText = this.formatWaveSummary(this.wave2Records);
    } else {
      const remainingSec = Math.max(
        0,
        (this.wave2DelayMs - (now - this.t0)) / 1000
      ).toFixed(1);
      this.wave2SummaryText = `Scheduled in ${remainingSec}s`;
    }

    const wave1Targets = this.wave1Records.filter(
      (r) => r.api.targetOfBug && !r.missing
    );
    const wave2Targets = this.wave2Records.filter(
      (r) => r.api.targetOfBug && !r.missing
    );

    if (wave1Targets.length === 0) {
      this.verdictState = 'fail';
      this.verdictText =
        'No target Built-In AI APIs (Summarizer, LanguageModel, Writer, Rewriter, Proofreader) are exposed in this browser.';
      return;
    }

    const wave1Unsettled = wave1Targets.filter((r) => !r.settled);
    const wave2Settled = wave2Targets.filter((r) => r.settled);

    if (
      this.wave2Started &&
      wave2Settled.some((w2) => {
        const w1 = wave1Targets.find((d) => d.api.id === w2.api.id);
        return w1 && !w1.settled;
      })
    ) {
      this.verdictState = 'fail';
      this.verdictText =
        'BUG REPRODUCED (Scenario A): Wave 2 (+4s) resolved immediately while Wave 1 (0ms) is still stuck pending!';
      return;
    }

    if (wave1Unsettled.some((r) => now - r.startTime >= this.hungThresholdMs)) {
      this.verdictState = 'fail';
      this.verdictText = `BUG REPRODUCED: ${wave1Unsettled.length} Wave 1 availability() call(s) still hung after >5s!`;
      return;
    }

    if (
      wave1Unsettled.length === 0 &&
      (!this.wave2Started || wave2Targets.every((r) => r.settled))
    ) {
      this.verdictState = 'pass';
      this.verdictText = this.wave2Started
        ? 'PASS: All Wave 1 (cold start) and Wave 2 (+4s) availability() calls settled cleanly.'
        : 'Wave 1 (cold start) settled cleanly! Waiting for Wave 2 (+4s) confirmation...';
      return;
    }

    this.verdictState = 'running';
    this.verdictText = 'Waiting for availability() promises to settle...';
  }
}
