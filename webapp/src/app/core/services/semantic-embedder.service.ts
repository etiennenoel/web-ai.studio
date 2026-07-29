import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SemanticEmbedderTaskType =
  | 'semantic-similarity'
  | 'retrieval-query'
  | 'retrieval-document'
  | 'classification'
  | 'clustering';

export interface ScoredResult {
  index: number;
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class SemanticEmbedderService {
  private isBrowser: boolean;

  /** One live embedder per task type, kept for the lifetime of the session. */
  private embedders = new Map<string, any>();

  /** Vectors cached per (taskType, text) so re-embedding the same corpus is free. */
  private vectorCache = new Map<string, Float32Array>();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  isSupported(): boolean {
    return this.isBrowser && 'SemanticEmbedder' in (window as any);
  }

  async availability(): Promise<string> {
    if (!this.isSupported()) return 'unavailable';
    try {
      return await (window as any).SemanticEmbedder.availability();
    } catch {
      return 'unavailable';
    }
  }

  async getEmbedder(
    taskType?: SemanticEmbedderTaskType,
    onDownloadProgress?: (loaded: number) => void
  ): Promise<any> {
    const key = taskType ?? 'default';
    const existing = this.embedders.get(key);
    if (existing) return existing;

    const options: any = {
      monitor: (m: any) =>
        m.addEventListener('downloadprogress', (e: any) => onDownloadProgress?.(e.loaded))
    };
    if (taskType) options.taskType = taskType;

    const embedder = await (window as any).SemanticEmbedder.create(options);
    this.embedders.set(key, embedder);
    return embedder;
  }

  /** Embeds a batch of texts in a single call, returning one vector per input, in order. */
  async embed(
    texts: string[],
    taskType?: SemanticEmbedderTaskType,
    onDownloadProgress?: (loaded: number) => void
  ): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    const cacheKey = (text: string) => `${taskType ?? 'default'}\u0000${text}`;
    const missing = [...new Set(texts.filter(t => !this.vectorCache.has(cacheKey(t))))];

    if (missing.length > 0) {
      const embedder = await this.getEmbedder(taskType, onDownloadProgress);
      const result = await embedder.embed(missing.length === 1 ? missing[0] : missing);
      (result.embeddings || []).forEach((embedding: any, i: number) => {
        this.vectorCache.set(cacheKey(missing[i]), embedding.values);
      });
    }

    return texts.map(t => this.vectorCache.get(cacheKey(t))!);
  }

  async embedOne(text: string, taskType?: SemanticEmbedderTaskType): Promise<Float32Array> {
    const [vector] = await this.embed([text], taskType);
    return vector;
  }

  cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return NaN;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /** Ranks every vector against the query and returns the k best as {index, score}. */
  topK(query: Float32Array, vectors: Float32Array[], k: number, minScore = -1): ScoredResult[] {
    return vectors
      .map((vector, index) => ({ index, score: this.cosineSimilarity(query, vector) }))
      .filter(result => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /** Mean of a set of vectors — the centroid used for nearest-centroid classification. */
  meanVector(vectors: Float32Array[]): Float32Array {
    const mean = new Float32Array(vectors[0].length);
    for (const vector of vectors) {
      for (let i = 0; i < mean.length; i++) mean[i] += vector[i];
    }
    for (let i = 0; i < mean.length; i++) mean[i] /= vectors.length;
    return mean;
  }
}
