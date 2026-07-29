import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

interface DocumentChunk {
  text: string;
  vector: Float32Array;
}

interface RetrievedChunk {
  text: string;
  score: number;
}

const SAMPLE_DOCUMENT = `Aurora One — Owner's Manual

Welcome to your Aurora One electric bike. This manual covers charging, range, maintenance, and warranty. Please read the safety section before your first ride and keep this document for future reference.

Charging the battery: connect the supplied 4A fast charger to the port under the top tube. A full charge from empty takes about 3.5 hours, and an 80% charge takes just under 2 hours. The battery indicator pulses green while charging and turns solid green when complete. Only use the official Aurora charger; third-party chargers void the battery warranty.

Range and riding modes: in Eco mode the Aurora One reaches up to 95 km on a single charge. Sport mode delivers stronger acceleration but reduces range to roughly 60 km. Range varies with rider weight, terrain, tire pressure, and outside temperature — cold weather below 0°C can temporarily reduce range by up to 25%.

Water and weather: the Aurora One is rated IP65. Riding in rain is perfectly fine, but avoid submerging the bike, riding through deep standing water, or cleaning it with a pressure washer, as high-pressure jets can force water past the seals and damage the motor controller.

Pairing the app: download the Aurora Ride app, enable Bluetooth, and hold the power button for five seconds until the display shows a pairing code. Enter the code in the app to link your phone. The app provides GPS ride tracking, over-the-air firmware updates, and an anti-theft alarm that triggers if the bike is moved while locked.

Maintenance schedule: check tire pressure weekly (recommended 3.5 bar front, 4.0 bar rear). Clean and lightly oil the chain every 250 km. Have the brake pads inspected every 1,000 km. A full service at an authorized dealer is recommended once a year or every 3,000 km, whichever comes first.

Battery care and storage: for long-term storage, keep the battery charged between 40% and 60% and store it indoors between 10°C and 25°C. Never leave the battery in a parked car in summer. The battery retains at least 80% of its capacity after 800 full charge cycles under normal conditions.

Warranty: the frame is covered for 5 years, the battery and motor for 2 years or 15,000 km, and electronic components for 2 years. The warranty does not cover wear parts such as tires, brake pads, and the chain, nor damage caused by unauthorized modifications, racing, or use of non-official chargers.`;

@Component({
  selector: 'app-document-chat-demo',
  templateUrl: './document-chat-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class DocumentChatDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'document-chat')!;

  documentText = SAMPLE_DOCUMENT;
  question = '';
  sampleQuestions = [
    'How long does a full charge take?',
    'Can I ride it in heavy rain?',
    'How do I connect my phone?',
    'Is my chain covered by the warranty?'
  ];

  chunks: DocumentChunk[] = [];
  isIndexing = false;
  indexed = false;
  indexingTimeMs: number | null = null;

  retrieved: RetrievedChunk[] = [];
  retrievalTimeMs: number | null = null;
  answer = '';

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkEmbedderAvailability();
    await this.checkAvailability();
  }

  onDocumentChanged() {
    this.indexed = false;
    this.chunks = [];
    this.retrieved = [];
    this.answer = '';
  }

  private chunkDocument(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim().replace(/\s+/g, ' '))
      .filter(p => p.length > 0);
  }

  async indexDocument() {
    const parts = this.chunkDocument(this.documentText);
    if (parts.length === 0 || this.isIndexing) return;

    this.isIndexing = true;
    this.indexed = false;
    this.errorMessage = '';
    this.retrieved = [];
    this.answer = '';
    const start = performance.now();

    try {
      const vectors = await this.semanticEmbedder.embed(parts, 'retrieval-document', this.onDownloadProgress);
      this.chunks = parts.map((text, i) => ({ text, vector: vectors[i] }));
      this.indexingTimeMs = Math.round(performance.now() - start);
      this.indexed = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to index the document.';
    } finally {
      this.isIndexing = false;
    }
  }

  get canAsk(): boolean {
    return this.indexed
      && this.state !== PromptInputStateEnum.Inferencing
      && this.languageModelAvailability !== 'unavailable';
  }

  askSample(sample: string) {
    this.question = sample;
    this.ask();
  }

  async ask() {
    const q = this.question.trim();
    if (!q || !this.canAsk) return;

    this.state = PromptInputStateEnum.Inferencing;
    this.answer = '';
    this.retrieved = [];
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    this.retrievalTimeMs = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      // Retrieval: embed the question and rank the chunks
      const queryVector = await this.semanticEmbedder.embedOne(q, 'retrieval-query');
      const top = this.semanticEmbedder.topK(queryVector, this.chunks.map(c => c.vector), 3);
      this.retrieved = top.map(r => ({ text: this.chunks[r.index].text, score: r.score }));
      this.retrievalTimeMs = Math.round(performance.now() - startTime);

      // Generation: ground the Prompt API in the retrieved passages
      const context = this.retrieved.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
      const session = await LanguageModel.create({
        systemPrompt: 'You answer questions about a document. Use ONLY the numbered context passages provided. Cite the passage numbers you used, like [1]. If the context does not contain the answer, say you cannot find it in the document. Be concise.'
      });

      const stream = session.promptStreaming(`Context passages:\n${context}\n\nQuestion: ${q}`, {
        signal: this.abortController.signal
      });

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.answer += chunk;
      }

      this.totalTime = Math.round(performance.now() - startTime);
      session.destroy?.();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Failed to answer the question.';
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  get dynamicCodeSnippet(): string {
    const q = this.question.trim() || 'How long does a full charge take?';
    return `// 1. Index: chunk the document and embed every chunk in one batch
const docEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-document" });
const chunks = documentText.split(/\\n\\s*\\n/); // ${this.chunks.length || 'N'} chunks
const { embeddings } = await docEmbedder.embed(chunks);

// 2. Retrieve: embed the question with the query task type, rank chunks by cosine similarity
const queryEmbedder = await SemanticEmbedder.create({ taskType: "retrieval-query" });
const query = await queryEmbedder.embed(${JSON.stringify(q)});
const queryVector = query.embeddings[0].values;
const top3 = embeddings
  .map((e, i) => ({ i, score: cosineSimilarity(queryVector, e.values) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

// 3. Generate: ground the on-device LLM in the retrieved passages
const session = await LanguageModel.create({
  systemPrompt: "Answer using ONLY the numbered context passages. Cite them like [1]."
});
const context = top3.map((t, n) => \`[\${n + 1}] \${chunks[t.i]}\`).join("\\n\\n");
const stream = session.promptStreaming(
  \`Context passages:\\n\${context}\\n\\nQuestion: ${q.replace(/`/g, '')}\`
);
for await (const chunk of stream) {
  console.log(chunk);
}`;
  }
}
