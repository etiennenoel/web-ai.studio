import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageModel: any;

interface IndexedPhoto {
  id: number;
  url: string;
  caption: string | null;
  vector: Float32Array | null;
  score: number | null;
  status: 'pending' | 'captioning' | 'ready' | 'error';
}

@Component({
  selector: 'app-photo-search-demo',
  templateUrl: './photo-search-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class PhotoSearchDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'photo-search')!;

  photos: IndexedPhoto[] = [];
  query = '';
  isIndexing = false;
  indexedCount = 0;
  searchLatencyMs: number | null = null;
  hasSearched = false;

  sampleQueries = ['food on a table', 'someone smiling', 'outdoors in nature', 'a screen or device', 'an animal'];

  private query$ = new Subject<string>();
  private searchToken = 0;
  private nextId = 1;
  private captionSession: any = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);

    this.subscriptions.push(
      this.query$.pipe(debounceTime(250)).subscribe(q => this.search(q))
    );

    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    await this.checkAvailability([{ type: 'image' }]);
  }

  get statusPills() {
    return [
      { name: 'Prompt API (image)', status: this.languageModelAvailability },
      { name: 'Semantic Embedder', status: this.embedderStatus }
    ];
  }

  get readyPhotos(): IndexedPhoto[] {
    return this.photos.filter(p => p.status === 'ready');
  }

  get sortedPhotos(): IndexedPhoto[] {
    if (!this.hasSearched) return this.photos;
    return [...this.photos].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }

  async onFilesSelected(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (files.length === 0) return;

    const added: IndexedPhoto[] = [];
    for (const file of files.slice(0, 12)) {
      added.push({
        id: this.nextId++,
        url: URL.createObjectURL(file),
        caption: null,
        vector: null,
        score: null,
        status: 'pending'
      });
    }
    this.photos.push(...added);
    (event.target as HTMLInputElement).value = '';

    await this.indexPhotos(added, files.slice(0, 12));
  }

  private async indexPhotos(photos: IndexedPhoto[], files: File[]) {
    if (this.languageModelAvailability === 'unavailable' || this.embedderStatus === 'unavailable') {
      this.errorMessage = 'Indexing needs the multimodal Prompt API and the Semantic Embedder.';
      photos.forEach(p => (p.status = 'error'));
      return;
    }

    this.isIndexing = true;
    this.errorMessage = '';

    try {
      if (!this.captionSession) {
        this.captionSession = await LanguageModel.create({
          expectedInputs: [{ type: 'image' }],
          systemPrompt: 'You caption photos for a search index. Reply with ONE factual sentence describing the main subjects, setting, and any visible text. No preamble.'
        });
      }

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        photo.status = 'captioning';
        try {
          const bitmap = await createImageBitmap(files[i]);
          // A clone keeps each caption independent — the session's context stays clean.
          const session = await this.captionSession.clone();
          photo.caption = (await session.prompt([{
            role: 'user',
            content: [
              { type: 'text', value: 'Caption this photo for search.' },
              { type: 'image', value: bitmap }
            ]
          }])).trim();
          session.destroy?.();

          photo.vector = await this.semanticEmbedder.embedOne(photo.caption!, 'retrieval-document');
          photo.status = 'ready';
          this.indexedCount++;
        } catch (e: any) {
          photo.status = 'error';
          this.errorMessage = e.message || 'Failed to index a photo.';
        }
      }

      if (this.query.trim()) this.search(this.query);
    } finally {
      this.isIndexing = false;
    }
  }

  removePhoto(photo: IndexedPhoto) {
    URL.revokeObjectURL(photo.url);
    this.photos = this.photos.filter(p => p.id !== photo.id);
    if (photo.status === 'ready') this.indexedCount--;
  }

  onQueryChanged(value: string) {
    this.query$.next(value);
  }

  useSample(sample: string) {
    this.query = sample;
    this.search(sample);
  }

  async search(rawQuery: string) {
    const query = rawQuery.trim();
    const token = ++this.searchToken;

    if (!query || this.readyPhotos.length === 0) {
      this.hasSearched = false;
      this.photos.forEach(p => (p.score = null));
      return;
    }

    try {
      const start = performance.now();
      const queryVector = await this.semanticEmbedder.embedOne(query, 'retrieval-query');
      if (token !== this.searchToken) return;

      this.searchLatencyMs = Math.round(performance.now() - start);
      for (const photo of this.photos) {
        photo.score = photo.vector ? this.semanticEmbedder.cosineSimilarity(queryVector, photo.vector) : null;
      }
      this.hasSearched = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Search failed.';
    }
  }

  override ngOnDestroy() {
    this.photos.forEach(photo => URL.revokeObjectURL(photo.url));
    this.captionSession?.destroy?.();
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
