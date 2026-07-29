import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const Proofreader: any;

interface ProofCorrection {
  startIndex: number;
  endIndex: number;
  correction: string;
  types: string[];
  explanation: string | null;
}

interface TextSegment {
  text: string;
  correction: ProofCorrection | null;
  correctionIndex: number;
}

const SAMPLE_TEXT =
  'I has went to the libary yesterday, but they was allready closed. ' +
  'Me and him decided to goes back tommorow morning, weather or not it rains. ' +
  'Their going to be so much books to chose from!';

@Component({
  selector: 'app-proofreader-inline-demo',
  templateUrl: './proofreader-inline-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ProofreaderInlineDemoComponent extends BasePage implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'proofreader-inline')!;

  text = SAMPLE_TEXT;
  proofreaderStatus = 'loading...';
  errorMessage = '';

  includeTypes = true;
  includeExplanations = true;

  isProofreading = false;
  hasResult = false;
  corrections: ProofCorrection[] = [];
  segments: TextSegment[] = [];
  correctedInput = '';
  selectedIndex: number | null = null;
  proofreadTimeMs: number | null = null;
  acceptedCount = 0;

  private proofreader: any = null;

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
      this.proofreaderStatus = 'Proofreader' in self ? await Proofreader.availability() : 'unavailable';
    } catch {
      this.proofreaderStatus = 'unavailable';
    }
  }

  get selectedCorrection(): ProofCorrection | null {
    return this.selectedIndex !== null ? this.corrections[this.selectedIndex] ?? null : null;
  }

  get typeCounts(): { type: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const correction of this.corrections) {
      for (const type of correction.types.length ? correction.types : ['unlabeled']) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }

  get hasStructuredMetadata(): boolean {
    return this.corrections.some(c => c.types.length > 0 || c.explanation);
  }

  onTextChanged() {
    this.hasResult = false;
    this.corrections = [];
    this.segments = [];
    this.selectedIndex = null;
  }

  async onOptionsChanged() {
    // Options are fixed at create() time — a new proofreader is needed.
    this.proofreader?.destroy?.();
    this.proofreader = null;
    if (this.hasResult) await this.proofread();
  }

  async proofread() {
    const input = this.text;
    if (!input.trim() || this.isProofreading) return;

    this.isProofreading = true;
    this.errorMessage = '';
    this.selectedIndex = null;
    const start = performance.now();

    try {
      if (!this.proofreader) {
        this.proofreader = await Proofreader.create({
          expectedInputLanguages: ['en'],
          includeCorrectionTypes: this.includeTypes,
          includeCorrectionExplanations: this.includeExplanations
        });
      }

      const result = await this.proofreader.proofread(input);
      this.proofreadTimeMs = Math.round(performance.now() - start);

      this.correctedInput = result.correctedInput ?? result.correction ?? input;
      this.corrections = (result.corrections ?? []).map((c: any) => ({
        startIndex: c.startIndex,
        endIndex: c.endIndex,
        correction: c.correction ?? '',
        types: Array.isArray(c.types) ? c.types : (c.type ? [c.type] : []),
        explanation: c.explanation ?? null
      })).sort((a: ProofCorrection, b: ProofCorrection) => a.startIndex - b.startIndex);

      this.segments = this.buildSegments(input, this.corrections);
      this.hasResult = true;
      if (this.corrections.length > 0) this.selectedIndex = 0;
    } catch (e: any) {
      this.errorMessage = e.message || 'Proofreading failed.';
    } finally {
      this.isProofreading = false;
    }
  }

  /** Splits the original text into plain and underlined (correction) segments. */
  private buildSegments(input: string, corrections: ProofCorrection[]): TextSegment[] {
    const segments: TextSegment[] = [];
    let cursor = 0;
    corrections.forEach((correction, index) => {
      if (correction.startIndex > cursor) {
        segments.push({ text: input.slice(cursor, correction.startIndex), correction: null, correctionIndex: -1 });
      }
      segments.push({
        text: input.slice(correction.startIndex, correction.endIndex),
        correction,
        correctionIndex: index
      });
      cursor = correction.endIndex;
    });
    if (cursor < input.length) {
      segments.push({ text: input.slice(cursor), correction: null, correctionIndex: -1 });
    }
    return segments;
  }

  select(index: number) {
    this.selectedIndex = index;
  }

  async acceptCorrection(index: number) {
    const correction = this.corrections[index];
    if (!correction) return;
    this.text = this.text.slice(0, correction.startIndex) + correction.correction + this.text.slice(correction.endIndex);
    this.acceptedCount++;
    await this.proofread();
  }

  async acceptAll() {
    if (!this.correctedInput) return;
    this.acceptedCount += this.corrections.length;
    this.text = this.correctedInput;
    await this.proofread();
  }

  typeChipClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'spelling': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'grammar': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400';
      case 'punctuation': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'capitalization': return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400';
      case 'preposition': return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400';
      case 'missing-words': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
      default: return 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400';
    }
  }

  get dynamicCodeSnippet(): string {
    return `const proofreader = await Proofreader.create({
  expectedInputLanguages: ["en"],
  includeCorrectionTypes: ${this.includeTypes},${this.includeTypes ? '        // labels: spelling, grammar, punctuation...' : ''}
  includeCorrectionExplanations: ${this.includeExplanations}${this.includeExplanations ? ' // plain-language "why" per correction' : ''}
});

const result = await proofreader.proofread(text);

// The fully corrected string
console.log(result.correctedInput);

// Structured corrections: indices point into the ORIGINAL text,
// which is exactly what an inline editor UI needs for underlines
for (const c of result.corrections) {
  console.log(
    text.slice(c.startIndex, c.endIndex), // the error span
    "→", c.correction,                    // the fix
    c.types,                              // e.g. ["grammar"]
    c.explanation                         // e.g. "Subject-verb agreement"
  );
}

// Accepting one correction = splicing it into the string
function accept(c) {
  return text.slice(0, c.startIndex) + c.correction + text.slice(c.endIndex);
}`;
  }
}
