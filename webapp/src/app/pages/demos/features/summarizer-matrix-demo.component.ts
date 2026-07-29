import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const Summarizer: any;

type SummaryType = 'tldr' | 'key-points' | 'teaser' | 'headline';
type SummaryLength = 'short' | 'medium' | 'long';

interface MatrixCell {
  type: SummaryType;
  length: SummaryLength;
  text: string | null;
  isGenerating: boolean;
  timeMs: number | null;
}

const SAMPLE_ARTICLE = `Browsers are quietly becoming AI platforms. Over the past two years, Chrome has shipped a family of Built-In AI APIs that expose on-device models to any web page: a general-purpose language model behind the Prompt API, task-specific endpoints for summarizing, writing, rewriting, proofreading, and translating text, an embedding model for semantic search, and on-device speech recognition through the Web Speech API.

The engineering bet behind the effort is that many AI features do not need a frontier model in a data center. Summarizing an email thread, correcting grammar as someone types, translating a chat message, or ranking help articles by meaning are all tasks that small, specialized models handle well — and they are exactly the tasks where privacy, latency, and cost matter most. When the model runs on the user's own hardware, keystrokes never leave the device, responses begin in milliseconds, and developers pay nothing per call.

The approach also changes how web developers ship AI. Instead of every site bundling its own multi-hundred-megabyte model, the browser downloads a shared model once and every origin uses it. Availability APIs let pages detect whether a capability is ready, trigger a download when the user opts in, and fall back to server-side inference where necessary.

Skeptics point out real limits: on-device models are smaller and less capable than their cloud counterparts, hardware requirements exclude older devices, and cross-browser standardization is still in its early days at the W3C. But the direction is set. The most interesting question is no longer whether browsers will ship AI, but which interactions become possible when intelligence is a free, private, always-available part of the web platform.`;

@Component({
  selector: 'app-summarizer-matrix-demo',
  templateUrl: './summarizer-matrix-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SummarizerMatrixDemoComponent extends BasePage implements OnInit, OnDestroy {
  demo = DEMOS_DATA.find(d => d.id === 'summarizer-matrix')!;

  article = SAMPLE_ARTICLE;
  summarizerStatus = 'loading...';
  errorMessage = '';

  readonly types: SummaryType[] = ['headline', 'teaser', 'tldr', 'key-points'];
  readonly lengths: SummaryLength[] = ['short', 'medium', 'long'];

  readonly typeHints: Record<SummaryType, string> = {
    'headline': 'One attention-grabbing line',
    'teaser': 'A hook that invites reading on',
    'tldr': 'The whole thing, compressed',
    'key-points': 'The main facts as bullets'
  };

  cells: MatrixCell[] = this.types.flatMap(type =>
    this.lengths.map(length => ({ type, length, text: null, isGenerating: false, timeMs: null }))
  );

  isGeneratingAll = false;

  private summarizers = new Map<string, any>();

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    super(document, title);
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    try {
      this.summarizerStatus = 'Summarizer' in self ? await Summarizer.availability() : 'unavailable';
    } catch {
      this.summarizerStatus = 'unavailable';
    }
  }

  override ngOnDestroy() {
    this.summarizers.forEach(summarizer => summarizer.destroy?.());
    super.ngOnDestroy();
  }

  cell(type: SummaryType, length: SummaryLength): MatrixCell {
    return this.cells.find(c => c.type === type && c.length === length)!;
  }

  onArticleChanged() {
    this.cells.forEach(cell => {
      cell.text = null;
      cell.timeMs = null;
    });
  }

  get filledCount(): number {
    return this.cells.filter(c => c.text !== null).length;
  }

  async generateCell(cell: MatrixCell) {
    if (cell.isGenerating || this.summarizerStatus === 'unavailable' || !this.article.trim()) return;

    cell.isGenerating = true;
    this.errorMessage = '';
    const start = performance.now();
    try {
      const key = `${cell.type}|${cell.length}`;
      if (!this.summarizers.has(key)) {
        this.summarizers.set(key, await Summarizer.create({
          type: cell.type,
          length: cell.length,
          format: 'plain-text'
        }));
      }
      cell.text = await this.summarizers.get(key).summarize(this.article, {
        context: 'This is a technology article about browsers and on-device AI.'
      });
      cell.timeMs = Math.round(performance.now() - start);
    } catch (e: any) {
      this.errorMessage = e.message || 'Summarization failed.';
    } finally {
      cell.isGenerating = false;
    }
  }

  async generateAll() {
    if (this.isGeneratingAll) return;
    this.isGeneratingAll = true;
    try {
      for (const cell of this.cells) {
        if (cell.text === null) await this.generateCell(cell);
      }
    } finally {
      this.isGeneratingAll = false;
    }
  }

  get dynamicCodeSnippet(): string {
    return `// Summarizer options:
// type:   "headline" | "teaser" | "tldr" | "key-points"
// length: "short" | "medium" | "long"
// format: "plain-text" | "markdown"

for (const type of ["headline", "teaser", "tldr", "key-points"]) {
  for (const length of ["short", "medium", "long"]) {
    const summarizer = await Summarizer.create({
      type,
      length,
      format: "plain-text"
    });

    const summary = await summarizer.summarize(articleText, {
      context: "This is a technology article about browsers and on-device AI."
    });

    renderCell(type, length, summary);
    summarizer.destroy();
  }
}

// ${this.filledCount}/12 combinations generated so far in this session`;
  }
}
