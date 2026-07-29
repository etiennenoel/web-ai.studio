import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

interface TriageCategory {
  name: string;
  icon: string;
  colorClass: string;
  barClass: string;
  examples: string[];
  centroid: Float32Array | null;
  exampleVectors: Float32Array[];
}

interface TriageResult {
  category: TriageCategory;
  score: number;
  bestExample: string;
}

@Component({
  selector: 'app-smart-triage-demo',
  templateUrl: './smart-triage-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SmartTriageDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'smart-triage')!;

  categories: TriageCategory[] = [
    {
      name: 'Billing & Payments',
      icon: 'bi-credit-card',
      colorClass: 'text-amber-600 dark:text-amber-400',
      barClass: 'bg-amber-500',
      examples: [
        'I was charged twice for my subscription',
        'How do I update my credit card?',
        'I need a refund for last month\'s invoice'
      ],
      centroid: null,
      exampleVectors: []
    },
    {
      name: 'Bug Report',
      icon: 'bi-bug',
      colorClass: 'text-red-600 dark:text-red-400',
      barClass: 'bg-red-500',
      examples: [
        'The app crashes when I open settings',
        'Uploads fail with an error message',
        'The page freezes after I log in'
      ],
      centroid: null,
      exampleVectors: []
    },
    {
      name: 'Feature Request',
      icon: 'bi-lightbulb',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      barClass: 'bg-emerald-500',
      examples: [
        'It would be great to have a dark mode',
        'Please add an export to CSV option',
        'Can you support keyboard shortcuts?'
      ],
      centroid: null,
      exampleVectors: []
    },
    {
      name: 'Account & Login',
      icon: 'bi-person-lock',
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      barClass: 'bg-indigo-500',
      examples: [
        'I forgot my password and can\'t sign in',
        'How do I delete my account?',
        'My two-factor codes are not working'
      ],
      centroid: null,
      exampleVectors: []
    }
  ];

  message = '';
  sampleMessages = [
    'Why did my card get billed two times this month?',
    'The dashboard throws an error whenever I click export',
    'Would love an offline mode for long flights',
    'Can\'t get into my account after resetting my password'
  ];

  results: TriageResult[] = [];
  isClassifying = false;
  isEmbeddingExamples = false;
  centroidsReady = false;
  classifyLatencyMs: number | null = null;

  private message$ = new Subject<string>();
  private examplesChanged$ = new Subject<void>();
  private classifyToken = 0;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);

    this.subscriptions.push(
      this.message$.pipe(debounceTime(300)).subscribe(() => this.classify()),
      this.examplesChanged$.pipe(debounceTime(600)).subscribe(() => this.rebuildCentroids())
    );

    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    if (this.embedderStatus === 'available') {
      await this.rebuildCentroids();
    }
  }

  get topResult(): TriageResult | null {
    return this.results[0] ?? null;
  }

  get isUncertain(): boolean {
    return this.results.length >= 2 && this.results[0].score - this.results[1].score < 0.03;
  }

  onMessageChanged() {
    this.message$.next(this.message);
  }

  onExampleChanged() {
    this.centroidsReady = false;
    this.examplesChanged$.next();
  }

  useSample(sample: string) {
    this.message = sample;
    this.classify();
  }

  addExample(category: TriageCategory) {
    category.examples.push('');
  }

  removeExample(category: TriageCategory, index: number) {
    if (category.examples.length > 1) {
      category.examples.splice(index, 1);
      this.onExampleChanged();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  /**
   * Re-embeds every example phrase and recomputes the category centroids.
   * The service caches vectors per text, so only edited phrases hit the model.
   */
  async rebuildCentroids() {
    const allExamples = this.categories.flatMap(c => c.examples.map(e => e.trim()).filter(e => e.length > 0));
    if (allExamples.length === 0) return;

    this.isEmbeddingExamples = true;
    this.errorMessage = '';
    try {
      const vectors = await this.semanticEmbedder.embed(allExamples, 'classification', this.onDownloadProgress);
      let cursor = 0;
      for (const category of this.categories) {
        const cleaned = category.examples.map(e => e.trim()).filter(e => e.length > 0);
        category.exampleVectors = vectors.slice(cursor, cursor + cleaned.length);
        cursor += cleaned.length;
        category.centroid = category.exampleVectors.length > 0
          ? this.semanticEmbedder.meanVector(category.exampleVectors)
          : null;
      }
      this.centroidsReady = true;
      if (this.message.trim()) await this.classify();
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to embed the example phrases.';
    } finally {
      this.isEmbeddingExamples = false;
    }
  }

  async classify() {
    const text = this.message.trim();
    const token = ++this.classifyToken;

    if (!text || !this.centroidsReady) {
      this.results = [];
      return;
    }

    this.isClassifying = true;
    try {
      const start = performance.now();
      const messageVector = await this.semanticEmbedder.embedOne(text, 'classification');
      const latency = Math.round(performance.now() - start);
      if (token !== this.classifyToken) return;

      this.classifyLatencyMs = latency;
      this.results = this.categories
        .filter(c => c.centroid !== null)
        .map(category => {
          let bestExample = '';
          let bestExampleScore = -Infinity;
          const cleaned = category.examples.map(e => e.trim()).filter(e => e.length > 0);
          category.exampleVectors.forEach((vector, i) => {
            const score = this.semanticEmbedder.cosineSimilarity(messageVector, vector);
            if (score > bestExampleScore) {
              bestExampleScore = score;
              bestExample = cleaned[i];
            }
          });
          return {
            category,
            score: this.semanticEmbedder.cosineSimilarity(messageVector, category.centroid!),
            bestExample
          };
        })
        .sort((a, b) => b.score - a.score);
    } catch (e: any) {
      this.errorMessage = e.message || 'Classification failed.';
    } finally {
      if (token === this.classifyToken) this.isClassifying = false;
    }
  }

  get dynamicCodeSnippet(): string {
    const categoryLines = this.categories
      .map(c => `  ${JSON.stringify(c.name)}: ${JSON.stringify(c.examples.filter(e => e.trim()))}`)
      .join(',\n');
    return `const embedder = await SemanticEmbedder.create({ taskType: "classification" });

// Each category is defined only by example phrases — no training step
const categories = {
${categoryLines}
};

// A category's centroid is the mean of its example vectors
const centroids = {};
for (const [name, examples] of Object.entries(categories)) {
  const { embeddings } = await embedder.embed(examples);
  centroids[name] = meanVector(embeddings.map(e => e.values));
}

// Classify any incoming message by nearest centroid
const message = ${JSON.stringify(this.message.trim() || this.sampleMessages[0])};
const { embeddings: [m] } = await embedder.embed(message);

const ranked = Object.entries(centroids)
  .map(([name, centroid]) => ({ name, score: cosineSimilarity(m.values, centroid) }))
  .sort((a, b) => b.score - a.score);

console.log("Route to:", ranked[0].name);`;
  }
}
