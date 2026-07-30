import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;
declare const Summarizer: any;

interface Flashcard {
  question: string;
  answer: string;
  flipped: boolean;
}

interface TranscriptChunk {
  text: string;
  vector: Float32Array;
}

type KitStage = 'transcribe' | 'notes' | 'index' | 'flashcards';

const FLASHCARDS_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' }
        },
        required: ['question', 'answer'],
        additionalProperties: false
      }
    }
  },
  required: ['cards'],
  additionalProperties: false
};

const SAMPLE_TRANSCRIPT = `Today we are going to talk about photosynthesis, which is how plants convert light energy into chemical energy. The process happens in the chloroplasts, specifically using a green pigment called chlorophyll, which absorbs mostly red and blue light and reflects green — which is why leaves look green to us.

Photosynthesis has two main stages. The light-dependent reactions happen in the thylakoid membranes. Water molecules are split, releasing oxygen as a byproduct, and the energy is captured in two carrier molecules, ATP and NADPH. Remember that the oxygen we breathe is essentially a waste product of this stage.

The second stage is the Calvin cycle, which takes place in the stroma and does not require light directly. Here the plant uses the ATP and NADPH from the first stage to fix carbon dioxide from the air into glucose. The key enzyme is RuBisCO, which is widely considered the most abundant protein on Earth.

For the exam, know the overall equation: six CO2 plus six H2O, with light energy, yields one glucose molecule and six O2. And be ready to explain why photosynthesis rates change with light intensity, CO2 concentration, and temperature — those three are the classic limiting factors.`;

@Component({
  selector: 'app-study-kit-demo',
  templateUrl: './study-kit-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class StudyKitDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'study-kit')!;

  audioFile: File | null = null;
  transcript = '';
  pastedTranscript = '';
  notes = '';
  flashcards: Flashcard[] = [];
  chunks: TranscriptChunk[] = [];

  stage: KitStage | null = null;
  isBuilding = false;
  built = false;
  buildMs: number | null = null;

  question = '';
  answer = '';
  retrieved: { text: string; score: number }[] = [];
  isAnswering = false;

  summarizerStatus = 'loading...';

  sampleQuestions = [
    'What does RuBisCO do?',
    'Why do leaves look green?',
    'Where does the oxygen we breathe come from?',
    'What are the three limiting factors?'
  ];

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    await this.checkEmbedderAvailability();
    await this.checkAvailability([{ type: 'audio' }]);
    try {
      this.summarizerStatus = 'Summarizer' in self ? await Summarizer.availability() : 'unavailable';
    } catch { this.summarizerStatus = 'unavailable'; }
  }

  get statusPills() {
    return [
      { name: 'Prompt API (audio)', status: this.languageModelAvailability },
      { name: 'Summarizer', status: this.summarizerStatus },
      { name: 'Semantic Embedder', status: this.embedderStatus }
    ];
  }

  stageState(stage: KitStage): 'idle' | 'active' | 'done' {
    const order: KitStage[] = ['transcribe', 'notes', 'index', 'flashcards'];
    if (this.built) return 'done';
    if (this.stage === null) return 'idle';
    const currentIdx = order.indexOf(this.stage);
    const stageIdx = order.indexOf(stage);
    if (stageIdx < currentIdx) return 'done';
    if (stageIdx === currentIdx) return 'active';
    return 'idle';
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.audioFile = file;
      this.pastedTranscript = '';
    }
  }

  useSampleTranscript() {
    this.pastedTranscript = SAMPLE_TRANSCRIPT;
    this.audioFile = null;
  }

  get canBuild(): boolean {
    return !this.isBuilding
      && (!!this.audioFile || !!this.pastedTranscript.trim())
      && this.embedderStatus !== 'unavailable';
  }

  async build() {
    if (!this.canBuild) return;

    this.isBuilding = true;
    this.built = false;
    this.errorMessage = '';
    this.notes = '';
    this.flashcards = [];
    this.chunks = [];
    this.answer = '';
    this.retrieved = [];
    const start = performance.now();

    try {
      // Stage 1: transcript — from audio via the multimodal Prompt API, or pasted.
      this.stage = 'transcribe';
      if (this.audioFile) {
        if (this.languageModelAvailability === 'unavailable') {
          throw new Error('The Prompt API is unavailable — paste a transcript instead.');
        }
        const session = await LanguageModel.create({ expectedInputs: [{ type: 'audio' }] });
        this.transcript = await session.prompt([{
          role: 'user',
          content: [
            { type: 'text', value: 'Transcribe this lecture recording exactly as spoken.' },
            { type: 'audio', value: this.audioFile }
          ]
        }]);
        session.destroy?.();
      } else {
        this.transcript = this.pastedTranscript.trim();
      }

      // Stage 2: key-point notes with the Summarizer.
      this.stage = 'notes';
      if (this.summarizerStatus !== 'unavailable') {
        const summarizer = await Summarizer.create({ type: 'key-points', length: 'medium', format: 'plain-text' });
        this.notes = await summarizer.summarize(this.transcript, { context: 'This is a lecture transcript a student wants to revise from.' });
        summarizer.destroy?.();
      } else {
        this.notes = '';
      }

      // Stage 3: index the transcript for Q&A.
      this.stage = 'index';
      const parts = this.transcript.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
      const vectors = await this.semanticEmbedder.embed(parts, 'retrieval-document', this.onDownloadProgress);
      this.chunks = parts.map((text, i) => ({ text, vector: vectors[i] }));

      // Stage 4: flashcards via structured output.
      this.stage = 'flashcards';
      if (this.languageModelAvailability !== 'unavailable') {
        const session = await LanguageModel.create({
          systemPrompt: 'You create study flashcards from lecture transcripts. Questions should test understanding, answers should be one or two sentences.'
        });
        const response = await session.prompt(
          `Create flashcards from this lecture:\n\n${this.transcript}`,
          { responseConstraint: FLASHCARDS_SCHEMA }
        );
        session.destroy?.();
        this.flashcards = JSON.parse(response).cards.map((card: any) => ({ ...card, flipped: false }));
      }

      this.buildMs = Math.round(performance.now() - start);
      this.built = true;
      this.stage = null;
    } catch (e: any) {
      this.errorMessage = e.message || 'Building the study kit failed.';
      this.stage = null;
    } finally {
      this.isBuilding = false;
    }
  }

  useSampleQuestion(sample: string) {
    this.question = sample;
    this.ask();
  }

  async ask() {
    const q = this.question.trim();
    if (!q || !this.built || this.isAnswering || this.chunks.length === 0) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable — Q&A is disabled.';
      return;
    }

    this.isAnswering = true;
    this.answer = '';
    this.retrieved = [];
    this.errorMessage = '';
    this.state = PromptInputStateEnum.Inferencing;

    try {
      const queryVector = await this.semanticEmbedder.embedOne(q, 'retrieval-query');
      const top = this.semanticEmbedder.topK(queryVector, this.chunks.map(c => c.vector), 2);
      this.retrieved = top.map(r => ({ text: this.chunks[r.index].text, score: r.score }));

      const context = this.retrieved.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
      const session = await LanguageModel.create({
        systemPrompt: 'Answer the student\'s question using ONLY the provided lecture passages. Be concise and cite passage numbers like [1].'
      });
      const stream = session.promptStreaming(`Lecture passages:\n${context}\n\nQuestion: ${q}`);
      for await (const chunk of stream) {
        this.answer += chunk;
      }
      session.destroy?.();
    } catch (e: any) {
      this.errorMessage = e.message || 'Could not answer the question.';
    } finally {
      this.isAnswering = false;
      this.state = PromptInputStateEnum.Ready;
    }
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
