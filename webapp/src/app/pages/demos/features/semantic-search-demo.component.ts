import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

interface SearchResult {
  text: string;
  score: number;
  matchedWords?: string[];
  keywordOverlap?: number;
}

const HELP_CENTER: string[] = [
  // Orders & shipping
  'How do I track my order?',
  'Where is my package right now?',
  'My delivery is late, what should I do?',
  'Can I change my shipping address after ordering?',
  'Do you ship internationally?',
  'How much does express shipping cost?',
  'What happens if nobody is home for the delivery?',
  'My order arrived damaged, how do I report it?',
  // Returns & refunds
  'How do I return an item?',
  'What is your refund policy?',
  'How long does a refund take to appear?',
  'Can I exchange an item for a different size?',
  'Do I have to pay for return shipping?',
  'My return was rejected, what are my options?',
  'Can I return a product without the original box?',
  'How do I print a return label?',
  // Billing & payments
  'Why was my card charged twice?',
  'Which payment methods do you accept?',
  'How do I update my credit card details?',
  'Can I get an invoice for my purchase?',
  'Why did my payment fail?',
  'How do I redeem a gift card or promo code?',
  'When will my subscription renew?',
  'How do I cancel my subscription?',
  // Account
  'How do I reset my password?',
  'I cannot log into my account, what should I do?',
  'How do I change my email address?',
  'How do I delete my account permanently?',
  'Why am I not receiving your emails?',
  'How do I enable two-factor authentication?',
  'Can I merge two accounts into one?',
  'How do I update my notification preferences?',
  // Product
  'Is this product available in other colors?',
  'When will an out-of-stock item be available again?',
  'Where can I find the product size guide?',
  'Does the product come with a warranty?',
  'How do I register my product for warranty coverage?',
  'Are replacement parts available for purchase?',
  'Is there a user manual I can download?',
  'What is the difference between the standard and pro models?',
  // Security & privacy
  'How is my personal data used?',
  'How do I report a suspicious email pretending to be you?',
  'Is my payment information stored securely?',
  'How do I request a copy of my data?',
  'Someone used my account without permission, what now?',
  'How do I sign out of all devices at once?',
  'Do you sell my data to third parties?',
  'How do I report a security vulnerability?'
];

const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'does', 'i', 'my', 'me', 'to', 'of', 'in', 'for', 'on', 'it', 'what', 'how', 'can', 'and', 'or', 'with', 'was', 'be']);

@Component({
  selector: 'app-semantic-search-demo',
  templateUrl: './semantic-search-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SemanticSearchDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'semantic-search')!;

  corpus = HELP_CENTER;
  corpusVectors: Float32Array[] = [];

  query = '';
  sampleQueries = [
    'my parcel never showed up',
    'the app charged me two times',
    'I want my money back',
    'close my account forever',
    'phishing message in my inbox'
  ];

  isIndexing = false;
  indexReady = false;
  indexTimeMs: number | null = null;

  isSearching = false;
  embedLatencyMs: number | null = null;
  keywordResults: SearchResult[] = [];
  semanticResults: SearchResult[] = [];
  hasSearched = false;

  private query$ = new Subject<string>();
  private searchToken = 0;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);

    this.subscriptions.push(
      this.query$.pipe(debounceTime(250)).subscribe(q => this.search(q))
    );

    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();

    // Build the index automatically only if no download is needed.
    if (this.embedderStatus === 'available') {
      await this.buildIndex();
    }
  }

  onQueryChanged(value: string) {
    this.query$.next(value);
  }

  useSample(sample: string) {
    this.query = sample;
    this.search(sample);
  }

  async buildIndex() {
    if (this.isIndexing || this.indexReady) return;
    this.isIndexing = true;
    this.errorMessage = '';
    const start = performance.now();
    try {
      this.corpusVectors = await this.semanticEmbedder.embed(this.corpus, 'retrieval', this.onDownloadProgress);
      this.indexTimeMs = Math.round(performance.now() - start);
      this.indexReady = true;
      if (this.query.trim()) this.search(this.query);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to build the search index.';
    } finally {
      this.isIndexing = false;
    }
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/[^a-z0-9']+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  private keywordSearch(query: string): SearchResult[] {
    const queryTokens = [...new Set(this.tokenize(query))];
    if (queryTokens.length === 0) return [];

    return this.corpus
      .map(text => {
        const entryTokens = new Set(this.tokenize(text));
        const matchedWords = queryTokens.filter(t => entryTokens.has(t));
        return { text, score: matchedWords.length, matchedWords };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private keywordOverlap(query: string, text: string): number {
    const queryTokens = new Set(this.tokenize(query));
    return this.tokenize(text).filter(t => queryTokens.has(t)).length;
  }

  async search(rawQuery: string) {
    const query = rawQuery.trim();
    const token = ++this.searchToken;

    if (!query) {
      this.keywordResults = [];
      this.semanticResults = [];
      this.hasSearched = false;
      return;
    }

    this.keywordResults = this.keywordSearch(query);

    if (!this.indexReady) {
      this.hasSearched = true;
      return;
    }

    this.isSearching = true;
    try {
      const start = performance.now();
      const queryVector = await this.semanticEmbedder.embedOne(query, 'retrieval');
      const latency = Math.round(performance.now() - start);
      if (token !== this.searchToken) return; // a newer query superseded this one

      this.embedLatencyMs = latency;
      this.semanticResults = this.semanticEmbedder
        .topK(queryVector, this.corpusVectors, 5)
        .map(r => ({
          text: this.corpus[r.index],
          score: r.score,
          keywordOverlap: this.keywordOverlap(query, this.corpus[r.index])
        }));
      this.hasSearched = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Search failed.';
    } finally {
      if (token === this.searchToken) this.isSearching = false;
    }
  }

  get dynamicCodeSnippet(): string {
    const q = this.query.trim() || 'my parcel never showed up';
    return `const embedder = await SemanticEmbedder.create({ taskType: "retrieval" });

// Index the ${this.corpus.length} help center entries once, in a single batched call
const { embeddings } = await embedder.embed(helpCenterEntries);

// On every keystroke: embed the query on-device and rank by cosine similarity
const result = await embedder.embed(${JSON.stringify(q)});
const queryVector = result.embeddings[0].values;

const topResults = embeddings
  .map((e, i) => ({
    entry: helpCenterEntries[i],
    score: cosineSimilarity(queryVector, e.values)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

// Keyword search finds nothing for this query —
// semantic search matches "${this.semanticResults[0]?.text ?? 'Where is my package right now?'}"`;
  }
}
