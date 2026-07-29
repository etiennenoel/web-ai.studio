import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const Rewriter: any;

type RewriterTone = 'as-is' | 'more-formal' | 'more-casual';
type RewriterLength = 'as-is' | 'shorter' | 'longer';

interface PadCell {
  tone: RewriterTone;
  length: RewriterLength;
  text: string | null;
  isGenerating: boolean;
  timeMs: number | null;
}

const SAMPLE_TEXT =
  'hey! quick heads up - the demo kinda broke on my machine this morning, might wanna take a look before the big meeting so we don\'t look silly';

@Component({
  selector: 'app-tone-pad-demo',
  templateUrl: './tone-pad-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class TonePadDemoComponent extends BasePage implements OnInit, OnDestroy {
  demo = DEMOS_DATA.find(d => d.id === 'tone-pad')!;

  text = SAMPLE_TEXT;
  rewriterStatus = 'loading...';
  errorMessage = '';

  readonly tones: RewriterTone[] = ['more-casual', 'as-is', 'more-formal'];
  readonly lengths: RewriterLength[] = ['shorter', 'as-is', 'longer'];

  grid: PadCell[][] = this.lengths.map(length =>
    this.tones.map(tone => ({ tone, length, text: null, isGenerating: false, timeMs: null }))
  );

  selected: PadCell | null = null;
  isGeneratingAll = false;
  generatedCount = 0;

  private rewriters = new Map<string, any>();

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
      this.rewriterStatus = 'Rewriter' in self ? await Rewriter.availability() : 'unavailable';
    } catch {
      this.rewriterStatus = 'unavailable';
    }
  }

  override ngOnDestroy() {
    this.rewriters.forEach(rewriter => rewriter.destroy?.());
    super.ngOnDestroy();
  }

  isCenter(cell: PadCell): boolean {
    return cell.tone === 'as-is' && cell.length === 'as-is';
  }

  cellLabel(cell: PadCell): string {
    if (this.isCenter(cell)) return 'original';
    const tone = cell.tone === 'as-is' ? '' : cell.tone.replace('more-', '');
    const length = cell.length === 'as-is' ? '' : cell.length;
    return [tone, length].filter(Boolean).join(' · ');
  }

  toneAxisLabel(tone: RewriterTone): string {
    return tone === 'more-casual' ? 'More casual' : tone === 'more-formal' ? 'More formal' : 'Same tone';
  }

  lengthAxisLabel(length: RewriterLength): string {
    return length === 'shorter' ? 'Shorter' : length === 'longer' ? 'Longer' : 'Same length';
  }

  onTextChanged() {
    this.grid.flat().forEach(cell => {
      cell.text = null;
      cell.timeMs = null;
    });
    this.selected = null;
  }

  async selectCell(cell: PadCell) {
    this.selected = cell;
    if (!this.isCenter(cell) && cell.text === null && !cell.isGenerating) {
      await this.generateCell(cell);
    }
  }

  async generateCell(cell: PadCell) {
    if (this.isCenter(cell) || this.rewriterStatus === 'unavailable' || !this.text.trim()) return;

    cell.isGenerating = true;
    this.errorMessage = '';
    const start = performance.now();
    try {
      const key = `${cell.tone}|${cell.length}`;
      if (!this.rewriters.has(key)) {
        this.rewriters.set(key, await Rewriter.create({
          tone: cell.tone,
          length: cell.length,
          format: 'plain-text'
        }));
      }
      cell.text = await this.rewriters.get(key).rewrite(this.text);
      cell.timeMs = Math.round(performance.now() - start);
      this.generatedCount++;
    } catch (e: any) {
      this.errorMessage = e.message || 'Rewrite failed.';
    } finally {
      cell.isGenerating = false;
    }
  }

  async generateAll() {
    if (this.isGeneratingAll) return;
    this.isGeneratingAll = true;
    try {
      for (const cell of this.grid.flat()) {
        if (!this.isCenter(cell) && cell.text === null) {
          await this.generateCell(cell);
        }
      }
    } finally {
      this.isGeneratingAll = false;
    }
  }

  displayText(cell: PadCell): string {
    return this.isCenter(cell) ? this.text : (cell.text ?? '');
  }

  get pendingCount(): number {
    return this.grid.flat().filter(cell => !this.isCenter(cell) && cell.text === null).length;
  }

  get dynamicCodeSnippet(): string {
    const cell = this.selected && !this.isCenter(this.selected) ? this.selected : null;
    const tone = cell?.tone ?? 'more-formal';
    const length = cell?.length ?? 'shorter';
    return `// The Rewriter's option space is a grid:
// tone:   more-casual | as-is | more-formal
// length: shorter     | as-is | longer

const rewriter = await Rewriter.create({
  tone: "${tone}",
  length: "${length}",
  format: "plain-text"
});

const original = ${JSON.stringify(this.text.length > 120 ? this.text.slice(0, 120) + '…' : this.text)};

const rewritten = await rewriter.rewrite(original);
${cell?.text ? `// "${cell.text.slice(0, 100).replace(/"/g, '\\"')}${cell.text.length > 100 ? '…' : ''}"` : 'console.log(rewritten);'}

rewriter.destroy();`;
  }
}
