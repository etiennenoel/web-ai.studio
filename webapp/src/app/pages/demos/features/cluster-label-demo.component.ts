import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageModel: any;

interface ClusterPoint {
  text: string;
  cluster: number;
  x: number; // SVG coordinates
  y: number;
}

interface ClusterInfo {
  index: number;
  color: string;
  count: number;
  label: string;
  isLabeling: boolean;
}

const CLUSTER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7'];

const SAMPLE_FEEDBACK = `The app takes forever to load on my phone
Scrolling the feed is janky and slow
Search results take more than ten seconds to appear
Startup time has gotten noticeably worse lately
The editor lags badly once documents get long
Syncing large projects is painfully slow
The subscription is way too expensive for students
I wish there was a cheaper personal plan
The free tier is too limited to properly evaluate
Annual billing should come with a bigger discount
The price went up twice this year, not okay
Team pricing does not scale for small nonprofits
The new sidebar layout is confusing to navigate
Buttons are too small to tap on mobile
I can never find the settings I am looking for
The onboarding flow has way too many steps
Dark mode contrast makes the text hard to read
The icons are unclear without any labels
Support took five days to answer my ticket
The help articles are outdated and unhelpful
Live chat agents keep transferring me around
I never got a reply about my refund request
Phone support is impossible to reach
The community forum is full of unanswered questions`;

@Component({
  selector: 'app-cluster-label-demo',
  templateUrl: './cluster-label-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ClusterLabelDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'cluster-and-label')!;

  feedbackText = SAMPLE_FEEDBACK;
  k = 4;
  kOptions = [2, 3, 4, 5, 6];

  points: ClusterPoint[] = [];
  clusters: ClusterInfo[] = [];
  hoveredIndex: number | null = null;

  isClustering = false;
  clusteringTimeMs: number | null = null;
  hasClustered = false;

  // SVG canvas dimensions (viewBox units)
  readonly width = 640;
  readonly height = 400;
  readonly padding = 40;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    await this.checkAvailability();
  }

  get itemCount(): number {
    return this.parseItems().length;
  }

  get hoveredPoint(): ClusterPoint | null {
    return this.hoveredIndex !== null ? this.points[this.hoveredIndex] : null;
  }

  private parseItems(): string[] {
    return this.feedbackText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }

  async cluster() {
    const items = this.parseItems();
    if (items.length < this.k || this.isClustering) return;

    this.isClustering = true;
    this.errorMessage = '';
    this.hoveredIndex = null;
    const start = performance.now();

    try {
      const vectors = await this.semanticEmbedder.embed(items, 'clustering', this.onDownloadProgress);
      const normalized = vectors.map(v => this.normalize(v));
      const assignments = this.kMeans(normalized, this.k);
      const coords = this.pca2d(normalized);
      this.points = this.toSvgPoints(items, assignments, coords);
      this.clusters = Array.from({ length: this.k }, (_, index) => ({
        index,
        color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
        count: assignments.filter(a => a === index).length,
        label: `Cluster ${index + 1}`,
        isLabeling: false
      }));
      this.clusteringTimeMs = Math.round(performance.now() - start);
      this.hasClustered = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Clustering failed.';
    } finally {
      this.isClustering = false;
    }
  }

  /** Names every cluster with the Prompt API, one short label per cluster. */
  async labelClusters() {
    if (!this.hasClustered || this.languageModelAvailability === 'unavailable') return;

    this.clusters.forEach(c => (c.isLabeling = true));
    try {
      const session = await LanguageModel.create({
        systemPrompt: 'You label groups of user feedback. Reply with ONLY a short theme label of 2 to 4 words. No punctuation, no quotes, no explanations.'
      });
      for (const cluster of this.clusters) {
        const members = this.points.filter(p => p.cluster === cluster.index).map(p => p.text);
        try {
          const label = await session.prompt(`Feedback items:\n- ${members.join('\n- ')}\n\nTheme label:`);
          cluster.label = label.trim().replace(/^["']|["']$/g, '').split('\n')[0];
        } finally {
          cluster.isLabeling = false;
        }
      }
      session.destroy?.();
    } catch (e: any) {
      this.clusters.forEach(c => (c.isLabeling = false));
      this.errorMessage = e.message || 'Labeling failed.';
    }
  }

  clusterColor(clusterIndex: number): string {
    return CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
  }

  private normalize(vector: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm) || 1;
    const result = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) result[i] = vector[i] / norm;
    return result;
  }

  private squaredDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return sum;
  }

  /** Lloyd's algorithm with k-means++ initialization over normalized vectors. */
  private kMeans(vectors: Float32Array[], k: number): number[] {
    const n = vectors.length;
    const dims = vectors[0].length;

    // k-means++ seeding: pick each next centroid proportionally to squared distance
    const centroids: Float32Array[] = [vectors[Math.floor(Math.random() * n)]];
    while (centroids.length < k) {
      const distances = vectors.map(v => Math.min(...centroids.map(c => this.squaredDistance(v, c))));
      const total = distances.reduce((s, d) => s + d, 0);
      let r = Math.random() * total;
      let picked = 0;
      for (let i = 0; i < n; i++) {
        r -= distances[i];
        if (r <= 0) { picked = i; break; }
      }
      centroids.push(vectors[picked]);
    }

    let assignments = new Array(n).fill(0);
    for (let iteration = 0; iteration < 30; iteration++) {
      const next = vectors.map(v => {
        let best = 0, bestDistance = Infinity;
        centroids.forEach((c, ci) => {
          const distance = this.squaredDistance(v, c);
          if (distance < bestDistance) { bestDistance = distance; best = ci; }
        });
        return best;
      });

      if (next.every((a, i) => a === assignments[i]) && iteration > 0) break;
      assignments = next;

      for (let ci = 0; ci < k; ci++) {
        const members = vectors.filter((_, i) => assignments[i] === ci);
        if (members.length === 0) {
          // Re-seed an empty cluster with a random point
          centroids[ci] = vectors[Math.floor(Math.random() * n)];
          continue;
        }
        const mean = new Float32Array(dims);
        for (const m of members) for (let d = 0; d < dims; d++) mean[d] += m[d];
        for (let d = 0; d < dims; d++) mean[d] /= members.length;
        centroids[ci] = mean;
      }
    }
    return assignments;
  }

  /**
   * Projects high-dimensional vectors to 2D via PCA. Uses the Gram-matrix trick:
   * with n items, the top eigenvectors of the n×n Gram matrix give the PCA scores
   * directly, avoiding any work in the full embedding dimension.
   */
  private pca2d(vectors: Float32Array[]): [number, number][] {
    const n = vectors.length;
    const dims = vectors[0].length;

    const mean = new Float32Array(dims);
    for (const v of vectors) for (let d = 0; d < dims; d++) mean[d] += v[d];
    for (let d = 0; d < dims; d++) mean[d] /= n;
    const centered = vectors.map(v => {
      const row = new Float32Array(dims);
      for (let d = 0; d < dims; d++) row[d] = v[d] - mean[d];
      return row;
    });

    const gram: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        let sum = 0;
        for (let d = 0; d < dims; d++) sum += centered[i][d] * centered[j][d];
        return sum;
      })
    );

    const components: number[][] = [];
    let matrix = gram.map(row => [...row]);
    for (let c = 0; c < 2; c++) {
      let vec = Array.from({ length: n }, () => Math.random() - 0.5);
      for (let iteration = 0; iteration < 100; iteration++) {
        const next = matrix.map(row => row.reduce((s, value, j) => s + value * vec[j], 0));
        const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0)) || 1;
        vec = next.map(v => v / norm);
      }
      const eigenvalue = vec.reduce((s, vi, i) => s + vi * matrix[i].reduce((ss, value, j) => ss + value * vec[j], 0), 0);
      components.push(vec.map(v => v * Math.sqrt(Math.abs(eigenvalue))));
      matrix = matrix.map((row, i) => row.map((value, j) => value - eigenvalue * vec[i] * vec[j]));
    }

    return Array.from({ length: n }, (_, i) => [components[0][i], components[1][i]]);
  }

  private toSvgPoints(items: string[], assignments: number[], coords: [number, number][]): ClusterPoint[] {
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    return items.map((text, i) => ({
      text,
      cluster: assignments[i],
      x: this.padding + ((coords[i][0] - minX) / spanX) * (this.width - 2 * this.padding),
      y: this.padding + ((coords[i][1] - minY) / spanY) * (this.height - 2 * this.padding)
    }));
  }

  get dynamicCodeSnippet(): string {
    return `const embedder = await SemanticEmbedder.create({ taskType: "clustering" });

// Embed all ${this.itemCount} feedback items in one batched call
const { embeddings } = await embedder.embed(feedbackItems);
const vectors = embeddings.map(e => e.values);

// Group them with standard k-means (k = ${this.k})
const assignments = kMeans(vectors, ${this.k});

// Project to 2D with PCA for the scatter plot
const coords = pca2d(vectors);

// Let the on-device LLM name each cluster
const session = await LanguageModel.create({
  systemPrompt: "Reply with ONLY a 2-4 word theme label."
});
for (let c = 0; c < ${this.k}; c++) {
  const members = feedbackItems.filter((_, i) => assignments[i] === c);
  const label = await session.prompt(
    "Feedback items:\\n- " + members.join("\\n- ") + "\\n\\nTheme label:"
  );
  console.log(\`Cluster \${c + 1}: \${label}\`);
}`;
  }
}
