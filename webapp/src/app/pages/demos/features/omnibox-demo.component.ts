import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;
declare const LanguageDetector: any;
declare const Translator: any;
declare const Summarizer: any;
declare const Proofreader: any;
declare const Rewriter: any;

type RouteId = 'translate' | 'summarize' | 'proofread' | 'rewrite' | 'answer';

interface IntentRoute {
  id: RouteId;
  label: string;
  api: string;
  icon: string;
  exemplars: string[];
  centroid: Float32Array | null;
  score: number | null;
}

interface RoutingDecision {
  route: RouteId;
  rule: string;
  detectedLanguage?: string;
  routingMs: number;
}

const LONG_TEXT_THRESHOLD = 400;

@Component({
  selector: 'app-omnibox-demo',
  templateUrl: './omnibox-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class OmniboxDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'omnibox')!;

  input = '';
  output = '';
  outputLabel = '';
  isRunning = false;
  decision: RoutingDecision | null = null;
  executionMs: number | null = null;

  detectorStatus = 'loading...';

  routes: IntentRoute[] = [
    {
      id: 'summarize', label: 'Summarize', api: 'Summarizer', icon: 'bi-card-text',
      exemplars: ['Summarize this article for me', 'Give me the key points of this text', 'Condense this into a short overview'],
      centroid: null, score: null
    },
    {
      id: 'proofread', label: 'Proofread', api: 'Proofreader', icon: 'bi-patch-check',
      exemplars: ['Fix the typos and grammar in this text', 'Correct my writing mistakes', 'Check this for spelling errors'],
      centroid: null, score: null
    },
    {
      id: 'rewrite', label: 'Rewrite', api: 'Rewriter', icon: 'bi-pencil-square',
      exemplars: ['Make this sound more professional', 'Rephrase this more politely', 'Rewrite this in a formal tone'],
      centroid: null, score: null
    },
    {
      id: 'answer', label: 'Answer', api: 'Prompt API', icon: 'bi-chat-square-dots',
      exemplars: ['What is the capital of France?', 'How does photosynthesis work?', 'Explain why the sky is blue'],
      centroid: null, score: null
    }
  ];

  sampleInputs: { label: string; text: string }[] = [
    { label: 'A question', text: 'Why do cats purr, and does it always mean they are happy?' },
    { label: 'Fix my typos', text: 'Can you fix the grammar in this: I has went to the libary but they was allready closed.' },
    { label: 'Make it professional', text: 'Make this sound professional: hey boss, demo broke again, gonna be late with the fix, my bad.' },
    { label: 'French text', text: 'Le navigateur devient une plateforme d\'intelligence artificielle : les modèles s\'exécutent désormais directement sur l\'appareil.' },
    { label: 'A long article', text: 'Browsers are quietly becoming AI platforms. Over the past two years, Chrome has shipped a family of Built-In AI APIs that expose on-device models to any web page: a general-purpose language model, task-specific endpoints for summarizing, writing, rewriting, proofreading, and translating text, an embedding model for semantic search, and on-device speech recognition. The engineering bet is that many AI features do not need a frontier model in a data center. Summarizing an email thread, correcting grammar as someone types, or ranking help articles by meaning are tasks that small, specialized models handle well — and they are exactly the tasks where privacy, latency, and cost matter most. When the model runs on the user\'s own hardware, keystrokes never leave the device, responses begin in milliseconds, and developers pay nothing per call.' }
  ];

  private detector: any = null;
  private translators = new Map<string, any>();
  private centroidsReady = false;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    await this.checkEmbedderAvailability();
    try {
      this.detectorStatus = 'LanguageDetector' in self ? await LanguageDetector.availability() : 'unavailable';
    } catch { this.detectorStatus = 'unavailable'; }

    if (this.embedderStatus === 'available') {
      await this.prepareCentroids();
    }
  }

  get statusPills() {
    return [
      { name: 'Semantic Embedder', status: this.embedderStatus },
      { name: 'Language Detector', status: this.detectorStatus }
    ];
  }

  routeById(id: RouteId): IntentRoute | undefined {
    return this.routes.find(r => r.id === id);
  }

  private async prepareCentroids() {
    const allExemplars = this.routes.flatMap(r => r.exemplars);
    const vectors = await this.semanticEmbedder.embed(allExemplars, 'classification', this.onDownloadProgress);
    let cursor = 0;
    for (const route of this.routes) {
      route.centroid = this.semanticEmbedder.meanVector(vectors.slice(cursor, cursor + route.exemplars.length));
      cursor += route.exemplars.length;
    }
    this.centroidsReady = true;
  }

  useSample(sample: { label: string; text: string }) {
    this.input = sample.text;
    this.run();
  }

  async run() {
    const input = this.input.trim();
    if (!input || this.isRunning) return;

    this.isRunning = true;
    this.errorMessage = '';
    this.output = '';
    this.outputLabel = '';
    this.decision = null;
    this.executionMs = null;
    this.routes.forEach(r => (r.score = null));

    const routingStart = performance.now();

    try {
      // Rule 1: a confidently foreign input always routes to translation.
      let detectedLanguage: string | null = null;
      if (this.detectorStatus !== 'unavailable') {
        if (!this.detector) this.detector = await LanguageDetector.create();
        const results = await this.detector.detect(input);
        const top = results?.[0];
        if (top && top.detectedLanguage !== 'und' && top.detectedLanguage !== 'en' && top.confidence > 0.6) {
          detectedLanguage = top.detectedLanguage;
        }
      }

      if (detectedLanguage) {
        this.decision = {
          route: 'translate',
          rule: `Language Detector: not English (${detectedLanguage})`,
          detectedLanguage,
          routingMs: Math.round(performance.now() - routingStart)
        };
        await this.execute(input, this.decision);
        return;
      }

      // Rule 2: very long input is content to summarize, not an instruction.
      if (input.length > LONG_TEXT_THRESHOLD) {
        this.decision = {
          route: 'summarize',
          rule: `Length heuristic: ${input.length} chars > ${LONG_TEXT_THRESHOLD}`,
          routingMs: Math.round(performance.now() - routingStart)
        };
        await this.execute(input, this.decision);
        return;
      }

      // Rule 3: nearest intent centroid decides.
      if (!this.centroidsReady) {
        if (this.embedderStatus === 'unavailable') {
          this.decision = { route: 'answer', rule: 'Embedder unavailable — defaulting to the Prompt API', routingMs: 0 };
          await this.execute(input, this.decision);
          return;
        }
        await this.prepareCentroids();
      }

      const vector = await this.semanticEmbedder.embedOne(input, 'classification');
      let best: IntentRoute | null = null;
      for (const route of this.routes) {
        route.score = this.semanticEmbedder.cosineSimilarity(vector, route.centroid!);
        if (!best || route.score > (best.score ?? -1)) best = route;
      }

      this.decision = {
        route: best!.id,
        rule: `Embedding similarity: nearest to "${best!.label}" exemplars`,
        routingMs: Math.round(performance.now() - routingStart)
      };
      await this.execute(input, this.decision);
    } catch (e: any) {
      this.errorMessage = e.message || 'Routing failed.';
    } finally {
      this.isRunning = false;
    }
  }

  /** For "instruction: content" inputs, run the tool on the content only. */
  private extractPayload(input: string): string {
    const match = input.match(/^[^:\n]{0,80}:\s*([\s\S]+)$/);
    return match ? match[1].trim() : input;
  }

  private async execute(input: string, decision: RoutingDecision) {
    const start = performance.now();
    try {
      switch (decision.route) {
        case 'translate': {
          const key = `${decision.detectedLanguage}->en`;
          if (!this.translators.has(key)) {
            this.translators.set(key, await Translator.create({
              sourceLanguage: decision.detectedLanguage,
              targetLanguage: 'en'
            }));
          }
          this.output = await this.translators.get(key).translate(input);
          this.outputLabel = `Translated from ${decision.detectedLanguage} — Translator API`;
          break;
        }
        case 'summarize': {
          const summarizer = await Summarizer.create({ type: 'key-points', length: 'short', format: 'plain-text' });
          this.output = await summarizer.summarize(input);
          this.outputLabel = 'Key points — Summarizer API';
          summarizer.destroy?.();
          break;
        }
        case 'proofread': {
          const proofreader = await Proofreader.create({ expectedInputLanguages: ['en'] });
          const payload = this.extractPayload(input);
          const result = await proofreader.proofread(payload);
          const corrections = result.corrections?.length ?? 0;
          this.output = result.correctedInput ?? result.correction ?? payload;
          this.outputLabel = `${corrections} ${corrections === 1 ? 'correction' : 'corrections'} — Proofreader API`;
          proofreader.destroy?.();
          break;
        }
        case 'rewrite': {
          const rewriter = await Rewriter.create({ tone: 'more-formal', format: 'plain-text' });
          this.output = await rewriter.rewrite(this.extractPayload(input));
          this.outputLabel = 'More formal — Rewriter API';
          rewriter.destroy?.();
          break;
        }
        case 'answer': {
          const session = await LanguageModel.create();
          this.state = PromptInputStateEnum.Inferencing;
          const stream = session.promptStreaming(input);
          for await (const chunk of stream) {
            this.output += chunk;
          }
          this.state = PromptInputStateEnum.Ready;
          this.outputLabel = 'Answer — Prompt API';
          session.destroy?.();
          break;
        }
      }
      this.executionMs = Math.round(performance.now() - start);
    } catch (e: any) {
      this.state = PromptInputStateEnum.Ready;
      this.errorMessage = `${this.routeById(decision.route)?.api ?? decision.route} failed: ${e.message}`;
    }
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
