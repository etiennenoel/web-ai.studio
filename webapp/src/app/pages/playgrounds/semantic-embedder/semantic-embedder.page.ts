import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

declare const window: any;

interface EmbeddingRow {
  text: string;
  values: Float32Array;
  dimensions: number;
  tokenCount: number | null;
  truncated: boolean | null;
}

@Component({
  selector: 'app-semantic-embedder-playground',
  templateUrl: './semantic-embedder.page.html',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' }
})
export class SemanticEmbedderPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;

  availabilityStatus: string | null = null;

  availabilityTimeMs: number | null = null;
  sessionCreationTimeMs: number | null = null;
  executionTimeMs: number | null = null;

  private availabilityTimer: any = null;
  private sessionTimer: any = null;
  private executionTimer: any = null;
  session: any = null;

  isCreating = false;
  isEmbedding = false;

  embeddings: EmbeddingRow[] = [];
  metadata: { embeddingSpace?: string; maxInputTokens?: number } | null = null;
  similarityMatrix: number[][] = [];

  errorMessage = '';
  shareText = 'Share';

  downloadProgress = 0;
  isDownloading = false;

  codeAvailability = '';
  codeSession = '';
  codeExecution = '';

  taskTypes = [
    { value: '', label: 'None (let the browser decide)' },
    { value: 'retrieval', label: 'retrieval' },
    { value: 'classification', label: 'classification' },
    { value: 'clustering', label: 'clustering' },
    { value: 'similarity', label: 'similarity' }
  ];

  private activeAbortController: AbortController | null = null;
  private creationAbortController: AbortController | null = null;

  constructor(
    private fb: FormBuilder,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initForm();

    const queryParams = this.route.snapshot.queryParams;
    if (Object.keys(queryParams).length > 0) {
      this.patchFormFromUrl(queryParams);
    }

    this.updateGeneratedCode();

    this.playgroundForm.valueChanges.subscribe(val => {
      this.updateGeneratedCode();
      this.updateUrl(val);
    });
  }

  ngOnDestroy() {
    this.destroySession();
    if (this.availabilityTimer) clearInterval(this.availabilityTimer);
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    if (this.executionTimer) clearInterval(this.executionTimer);
  }

  initForm() {
    this.playgroundForm = this.fb.group({
      taskType: [''],
      useAbortSignal: [true],
      inputs: this.fb.array([
        this.fb.control('The quick brown fox jumps over the lazy dog.'),
        this.fb.control('A fast, dark-colored fox leaps over a resting hound.'),
        this.fb.control('Embeddings are high-dimensional vectors representing semantic meaning.')
      ])
    });
  }

  get inputs(): FormArray {
    return this.playgroundForm.get('inputs') as FormArray;
  }

  addInput() {
    this.inputs.push(this.fb.control(''));
  }

  removeInput(index: number) {
    if (this.inputs.length > 1) this.inputs.removeAt(index);
  }

  updateUrl(val: any) {
    const queryParamsToSave: any = {};
    for (const key of Object.keys(val)) {
      const value = val[key];
      if (Array.isArray(value)) {
        if (value.length > 0) queryParamsToSave[key] = JSON.stringify(value);
      } else if (value !== null && value !== '') {
        queryParamsToSave[key] = value;
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParamsToSave,
      replaceUrl: true
    });
  }

  patchFormFromUrl(queryParams: any) {
    const patchValue: any = {};
    for (const key of Object.keys(queryParams)) {
      const value = queryParams[key];
      const control = this.playgroundForm.get(key);
      if (control instanceof FormArray) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            control.clear();
            parsed.forEach((item: any) => control.push(this.fb.control(item)));
          }
        } catch (e) {}
      } else {
        if (value === 'true') patchValue[key] = true;
        else if (value === 'false') patchValue[key] = false;
        else patchValue[key] = value;
      }
    }
    this.playgroundForm.patchValue(patchValue);
  }

  getSemanticEmbedder() {
    return (window as any).SemanticEmbedder;
  }

  getCreateOptions() {
    const val = this.playgroundForm.value;
    const options: any = {};
    if (val.taskType) options.taskType = val.taskType;
    return options;
  }

  /** Non-empty inputs, in order. */
  getInputTexts(): string[] {
    return this.inputs.value.map((v: string) => (v || '').trim()).filter((v: string) => v.length > 0);
  }

  async checkAvailability() {
    const api = this.getSemanticEmbedder();
    if (!api) {
      this.availabilityStatus = 'API not found.';
      return;
    }

    this.availabilityTimeMs = 0;
    const startTime = performance.now();
    this.availabilityTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.availabilityTimeMs = Math.floor(performance.now() - startTime);
        this.cdr.detectChanges();
      });
    }, 10);

    try {
      this.availabilityStatus = 'Checking...';
      this.availabilityStatus = await api.availability();
    } catch (e: any) {
      this.availabilityStatus = 'Error: ' + e.message;
    } finally {
      clearInterval(this.availabilityTimer);
      this.availabilityTimeMs = Math.floor(performance.now() - startTime);
    }
  }

  async createSession() {
    const api = this.getSemanticEmbedder();
    if (!api) {
      this.errorMessage = 'SemanticEmbedder is not exposed on this browser. Enable #semantic-embedder-api in Chrome Canary.';
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';
    this.downloadProgress = 0;

    this.sessionCreationTimeMs = 0;
    const sessionStartTime = performance.now();
    this.sessionTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.sessionCreationTimeMs = Math.floor(performance.now() - sessionStartTime);
        this.cdr.detectChanges();
      });
    }, 10);

    if (this.playgroundForm.value.useAbortSignal) {
      this.creationAbortController = new AbortController();
    }

    try {
      const options = this.getCreateOptions();

      options.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          this.ngZone.run(() => {
            this.isDownloading = true;
            this.downloadProgress = Math.round(e.loaded * 100);
            this.cdr.detectChanges();
          });
        });
      };

      if (this.creationAbortController) {
        options.signal = this.creationAbortController.signal;
      }

      this.session = await api.create(options);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create semantic embedder';
    } finally {
      clearInterval(this.sessionTimer);
      this.sessionCreationTimeMs = Math.floor(performance.now() - sessionStartTime);
      this.isCreating = false;
      this.isDownloading = false;
      this.creationAbortController = null;
    }
  }

  abortCreation() {
    if (this.creationAbortController) {
      this.creationAbortController.abort('User aborted creation');
    }
  }

  destroySession() {
    if (this.session) {
      if (typeof this.session.destroy === 'function') this.session.destroy();
      this.session = null;
    }
  }

  async runPrompt() {
    if (!this.session) return;

    const texts = this.getInputTexts();
    if (texts.length === 0) {
      this.errorMessage = 'Add at least one non-empty input.';
      return;
    }

    this.isEmbedding = true;
    this.errorMessage = '';
    this.embeddings = [];
    this.metadata = null;
    this.similarityMatrix = [];

    this.executionTimeMs = 0;
    const execStartTime = performance.now();
    this.executionTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.executionTimeMs = Math.floor(performance.now() - execStartTime);
        this.cdr.detectChanges();
      });
    }, 10);

    if (this.playgroundForm.value.useAbortSignal) {
      this.activeAbortController = new AbortController();
    }

    try {
      // A single string embeds one input; an array embeds the whole batch in one call.
      const input = texts.length === 1 ? texts[0] : texts;
      const result = await this.session.embed(input);

      this.embeddings = (result.embeddings || []).map((embedding: any, i: number) => ({
        text: texts[i],
        values: embedding.values,
        dimensions: embedding.values?.length ?? 0,
        tokenCount: embedding.statistics?.tokenCount ?? null,
        truncated: embedding.statistics?.truncated ?? null
      }));

      this.metadata = result.metadata || null;
      this.similarityMatrix = this.buildSimilarityMatrix(this.embeddings);
    } catch (e: any) {
      this.errorMessage = e.message || 'Error while embedding';
    } finally {
      this.isEmbedding = false;
      clearInterval(this.executionTimer);
      this.executionTimeMs = Math.floor(performance.now() - execStartTime);
      this.activeAbortController = null;
    }
  }

  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted embedding');
    }
  }

  buildSimilarityMatrix(rows: EmbeddingRow[]): number[][] {
    return rows.map(a => rows.map(b => this.cosineSimilarity(a.values, b.values)));
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

  /** First few components of a vector, for display. */
  previewVector(values: Float32Array, count = 8): string {
    if (!values) return '';
    const head = Array.from(values.slice(0, count)).map(v => v.toFixed(4));
    return `[${head.join(', ')}${values.length > count ? ', …' : ''}]`;
  }

  /** Tailwind background for a similarity cell: warmer = more similar. */
  similarityClass(score: number): string {
    if (isNaN(score)) return 'bg-slate-50 dark:bg-zinc-900 text-slate-400 dark:text-slate-500';
    if (score >= 0.9) return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300';
    if (score >= 0.75) return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    if (score >= 0.5) return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
    return 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-400';
  }

  truncateLabel(text: string, max = 40): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  copyVector(row: EmbeddingRow) {
    navigator.clipboard.writeText(JSON.stringify(Array.from(row.values)));
  }

  sharePlayground() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.shareText = 'Copied!';
      if (this.cdr) this.cdr.detectChanges();
      setTimeout(() => {
        this.shareText = 'Share';
        if (this.cdr) this.cdr.detectChanges();
      }, 2000);
    });
  }

  updateGeneratedCode() {
    const val = this.playgroundForm.value;
    const texts = this.getInputTexts();

    let code = `// Semantic Embedder API Configuration\n\n`;
    code += `const options = {\n`;
    if (val.taskType) code += `  taskType: "${val.taskType}",\n`;
    code += `};\n\n`;

    code += `const availability = await SemanticEmbedder.availability();\n\n`;

    if (val.useAbortSignal) code += `const controller = new AbortController();\noptions.signal = controller.signal;\n`;
    code += `options.monitor = (m) => m.addEventListener("downloadprogress", e => console.log(e.loaded));\n`;
    code += `const semanticEmbedder = await SemanticEmbedder.create(options);\n\n`;

    if (texts.length === 1) {
      code += `const result = await semanticEmbedder.embed(${JSON.stringify(texts[0])});\n`;
    } else {
      code += `const passages = [\n${texts.map(t => `  ${JSON.stringify(t)}`).join(',\n')}\n];\n\n`;
      code += `// Embed the entire batch in one call\n`;
      code += `const result = await semanticEmbedder.embed(passages);\n`;
    }
    code += `\nsemanticEmbedder.destroy();\n\n`;

    code += `console.log(result.metadata.embeddingSpace, result.metadata.maxInputTokens);\n`;
    code += `for (const embedding of result.embeddings) {\n`;
    code += `  console.log(embedding.values.length, embedding.values);\n`;
    code += `}\n\n`;

    if (texts.length > 1) {
      code += `// Compare the first two inputs\n`;
      code += `const similarity = cosineSimilarity(\n`;
      code += `  result.embeddings[0].values,\n`;
      code += `  result.embeddings[1].values\n`;
      code += `);\n`;
      code += `console.log("Similarity score:", similarity);\n\n`;
      code += `function cosineSimilarity(vecA, vecB) {\n`;
      code += `  let dotProduct = 0, normA = 0, normB = 0;\n`;
      code += `  for (let i = 0; i < vecA.length; i++) {\n`;
      code += `    dotProduct += vecA[i] * vecB[i];\n`;
      code += `    normA += vecA[i] * vecA[i];\n`;
      code += `    normB += vecB[i] * vecB[i];\n`;
      code += `  }\n`;
      code += `  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));\n`;
      code += `}\n`;
    }

    // Split the monolithic generated code into step-specific variables
    let tempCode = code;

    const availabilityMatch = tempCode.match(/([\s\S]*?await [A-Za-z]+\.availability[\s\S]*?\n\n)/);
    if (availabilityMatch) {
      this.codeAvailability = availabilityMatch[1].trim();
      tempCode = tempCode.substring(availabilityMatch[1].length);
    } else {
      this.codeAvailability = '// Availability check code not found';
    }

    const createMatch = tempCode.match(/([\s\S]*?await [A-Za-z]+\.create[\s\S]*?\n\n)/);
    if (createMatch) {
      this.codeSession = createMatch[1].trim();
      this.codeExecution = tempCode.substring(createMatch[1].length).trim();
    } else {
      this.codeSession = '// Session creation code not found';
      this.codeExecution = tempCode.trim();
    }
  }
}
