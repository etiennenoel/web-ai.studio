import { Component, OnInit, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { ThemeService } from '../../../core/services/theme.service';

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  vector?: Float32Array;
}

interface RankedAction {
  action: PaletteAction;
  score: number;
  keywordOverlap: number;
}

const ACTIONS: PaletteAction[] = [
  { id: 'toggle-theme', label: 'Toggle dark mode', description: 'Switch between the light and dark appearance', icon: 'bi-moon-stars' },
  { id: 'new-doc', label: 'Create new document', description: 'Start a blank document in the editor', icon: 'bi-file-earmark-plus' },
  { id: 'export-pdf', label: 'Export as PDF', description: 'Download the current page as a PDF file', icon: 'bi-file-earmark-pdf' },
  { id: 'share-link', label: 'Copy share link', description: 'Copy a public link to this page to the clipboard', icon: 'bi-link-45deg' },
  { id: 'mute', label: 'Mute notifications', description: 'Silence all alerts and badges for a while', icon: 'bi-bell-slash' },
  { id: 'font-size', label: 'Increase font size', description: 'Make the text larger and easier to read', icon: 'bi-zoom-in' },
  { id: 'shortcuts', label: 'View keyboard shortcuts', description: 'Show the list of available hotkeys', icon: 'bi-keyboard' },
  { id: 'clear-cache', label: 'Clear local cache', description: 'Free up storage used by offline data', icon: 'bi-trash3' },
  { id: 'invite', label: 'Invite a teammate', description: 'Send a collaboration invitation by email', icon: 'bi-person-plus' },
  { id: 'sign-out', label: 'Sign out', description: 'Log out of your account securely', icon: 'bi-box-arrow-right' },
  { id: 'print', label: 'Print this page', description: 'Send the current view to a printer', icon: 'bi-printer' },
  { id: 'focus', label: 'Enter focus mode', description: 'Hide side panels and distractions while writing', icon: 'bi-fullscreen' },
  { id: 'language', label: 'Change language', description: 'Switch the interface to another language', icon: 'bi-globe2' },
  { id: 'history', label: 'View version history', description: 'Browse and restore earlier versions of this document', icon: 'bi-clock-history' }
];

@Component({
  selector: 'app-command-palette-demo',
  templateUrl: './command-palette-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class CommandPaletteDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  private readonly themeService = inject(ThemeService);

  demo = DEMOS_DATA.find(d => d.id === 'command-palette')!;

  actions = ACTIONS;
  query = '';
  ranked: RankedAction[] = [];
  selectedIndex = 0;

  sampleIntents = [
    'make it easier on my eyes at night',
    'I want to work without distractions',
    'get this document onto paper',
    'let my colleague see this page',
    'the letters are too tiny for me'
  ];

  isIndexing = false;
  indexReady = false;
  isRanking = false;
  rankLatencyMs: number | null = null;

  executedLog: { label: string; icon: string; real: boolean }[] = [];

  private query$ = new Subject<string>();
  private rankToken = 0;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);

    this.subscriptions.push(
      this.query$.pipe(debounceTime(200)).subscribe(q => this.rank(q))
    );

    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    if (this.embedderStatus === 'available') {
      await this.buildIndex();
    }
  }

  async buildIndex() {
    if (this.isIndexing || this.indexReady) return;
    this.isIndexing = true;
    this.errorMessage = '';
    try {
      const texts = this.actions.map(a => `${a.label} — ${a.description}`);
      const vectors = await this.semanticEmbedder.embed(texts, 'retrieval', this.onDownloadProgress);
      this.actions.forEach((action, i) => (action.vector = vectors[i]));
      this.indexReady = true;
      if (this.query.trim()) this.rank(this.query);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to embed the actions.';
    } finally {
      this.isIndexing = false;
    }
  }

  onQueryChanged(value: string) {
    this.query$.next(value);
  }

  useSample(sample: string) {
    this.query = sample;
    this.rank(sample);
  }

  onKeydown(event: KeyboardEvent) {
    if (this.ranked.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.ranked.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.ranked.length) % this.ranked.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.execute(this.ranked[this.selectedIndex]?.action);
    }
  }

  execute(action: PaletteAction | undefined) {
    if (!action) return;
    const real = action.id === 'toggle-theme';
    if (real) {
      const isDark = this.document.documentElement.getAttribute('data-bs-theme') === 'dark';
      this.themeService.setTheme(isDark ? 'light' : 'dark');
    }
    this.executedLog.unshift({ label: action.label, icon: action.icon, real });
    if (this.executedLog.length > 6) this.executedLog.pop();
  }

  private tokenize(text: string): Set<string> {
    return new Set(text.toLowerCase().split(/[^a-z0-9']+/).filter(t => t.length > 2));
  }

  async rank(rawQuery: string) {
    const query = rawQuery.trim();
    const token = ++this.rankToken;

    if (!query || !this.indexReady) {
      this.ranked = [];
      this.selectedIndex = 0;
      return;
    }

    this.isRanking = true;
    try {
      const start = performance.now();
      const queryVector = await this.semanticEmbedder.embedOne(query, 'retrieval');
      const latency = Math.round(performance.now() - start);
      if (token !== this.rankToken) return;

      this.rankLatencyMs = latency;
      const queryTokens = this.tokenize(query);
      this.ranked = this.actions
        .map(action => ({
          action,
          score: this.semanticEmbedder.cosineSimilarity(queryVector, action.vector!),
          keywordOverlap: [...this.tokenize(action.label)].filter(t => queryTokens.has(t)).length
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
      this.selectedIndex = 0;
    } catch (e: any) {
      this.errorMessage = e.message || 'Ranking failed.';
    } finally {
      if (token === this.rankToken) this.isRanking = false;
    }
  }

  get dynamicCodeSnippet(): string {
    const q = this.query.trim() || this.sampleIntents[0];
    const top = this.ranked[0]?.action.label ?? 'Toggle dark mode';
    return `const embedder = await SemanticEmbedder.create({ taskType: "retrieval" });

const actions = [
  { label: "Toggle dark mode", description: "Switch between the light and dark appearance" },
  { label: "Export as PDF", description: "Download the current page as a PDF file" },
  // ... ${this.actions.length} actions total
];

// Embed every action once
const { embeddings } = await embedder.embed(
  actions.map(a => \`\${a.label} — \${a.description}\`)
);

// On every keystroke, rank the actions against the typed intent
const query = await embedder.embed(${JSON.stringify(q)});
const queryVector = query.embeddings[0].values;

const ranked = actions
  .map((a, i) => ({ ...a, score: cosineSimilarity(queryVector, embeddings[i].values) }))
  .sort((a, b) => b.score - a.score);

console.log(ranked[0].label); // "${top}"`;
  }
}
