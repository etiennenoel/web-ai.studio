import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseEmbedderDemoComponent } from '../components/base-demo/base-embedder-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const LanguageDetector: any;
declare const Translator: any;
declare const Summarizer: any;
declare const Writer: any;

type PipelineStage = 'pending' | 'detecting' | 'translating' | 'triaging' | 'done' | 'error';

interface InboxMessage {
  id: number;
  sender: string;
  flag: string;
  body: string;
  stage: PipelineStage;
  detectedLanguage: string | null;
  detectedConfidence: number | null;
  english: string | null;
  folder: string | null;
  folderScore: number | null;
  showOriginal: boolean;
  pipelineMs: number | null;
}

interface Folder {
  name: string;
  icon: string;
  chipClass: string;
  examples: string[];
  centroid: Float32Array | null;
}

interface ReplyDraft {
  tone: 'formal' | 'neutral' | 'casual';
  english: string;
  translated: string | null;
  targetLanguage: string | null;
  isDrafting: boolean;
  showEnglish: boolean;
}

const INBOX: { sender: string; flag: string; body: string }[] = [
  { sender: 'Camille Moreau', flag: '🇫🇷', body: 'Bonjour, j\'ai été facturée deux fois pour mon abonnement ce mois-ci. Pouvez-vous me rembourser ?' },
  { sender: 'Diego Fernández', flag: '🇪🇸', body: 'La aplicación se cierra cada vez que intento subir una foto desde mi teléfono.' },
  { sender: 'Lena Hoffmann', flag: '🇩🇪', body: 'Wäre es möglich, einen Dunkelmodus hinzuzufügen? Meine Augen würden es Ihnen danken!' },
  { sender: 'Priya Sharma', flag: '🇬🇧', body: 'Could we schedule a call next week to discuss the enterprise plan for my team?' },
  { sender: 'Antoine Lefèvre', flag: '🇫🇷', body: 'Votre dernière mise à jour est fantastique, l\'application est beaucoup plus rapide. Merci !' },
  { sender: 'Marcus Webb', flag: '🇺🇸', body: 'The export button does nothing when my report has more than a thousand rows.' },
  { sender: 'Lucía Ortiz', flag: '🇪🇸', body: '¿Cómo puedo cambiar la tarjeta de crédito asociada a mi cuenta?' },
  { sender: 'Jonas Becker', flag: '🇩🇪', body: 'Ich würde gerne wissen, ob eine Offline-Funktion geplant ist.' }
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese', it: 'Italian', pt: 'Portuguese'
};

@Component({
  selector: 'app-universal-inbox-demo',
  templateUrl: './universal-inbox-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class UniversalInboxDemoComponent extends BaseEmbedderDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'universal-inbox')!;

  inbox: InboxMessage[] = INBOX.map((m, i) => ({
    id: i + 1,
    ...m,
    stage: 'pending',
    detectedLanguage: null,
    detectedConfidence: null,
    english: null,
    folder: null,
    folderScore: null,
    showOriginal: false,
    pipelineMs: null
  }));

  folders: Folder[] = [
    {
      name: 'Billing', icon: 'bi-credit-card', chipClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      examples: ['I was charged twice for my subscription', 'How do I update my payment method?', 'I would like a refund for my last invoice'],
      centroid: null
    },
    {
      name: 'Bug Reports', icon: 'bi-bug', chipClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      examples: ['The app crashes when I upload a photo', 'The export button does not work at all', 'The page freezes right after I log in'],
      centroid: null
    },
    {
      name: 'Feature Requests', icon: 'bi-lightbulb', chipClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      examples: ['Please add a dark mode', 'It would be great to have an offline mode', 'Can you support keyboard shortcuts?'],
      centroid: null
    },
    {
      name: 'Meetings', icon: 'bi-calendar-event', chipClass: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
      examples: ['Can we schedule a call next week?', 'I would like to book a demo with your team', 'Are you available for a meeting on Tuesday?'],
      centroid: null
    },
    {
      name: 'Praise', icon: 'bi-heart', chipClass: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
      examples: ['I love the new update, great work!', 'The app is fantastic, thank you so much!', 'Amazing product, keep it up!'],
      centroid: null
    }
  ];

  detectorStatus = 'loading...';
  translatorStatus = 'loading...';
  summarizerStatus = 'loading...';
  writerStatus = 'loading...';

  isProcessing = false;
  processed = false;
  totalPipelineMs: number | null = null;

  digest = '';
  isDigesting = false;

  selectedMessage: InboxMessage | null = null;
  reply: ReplyDraft | null = null;

  private detector: any = null;
  private translators = new Map<string, any>();

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    await this.checkEmbedderAvailability();

    const probe = async (name: string, fn: () => Promise<string>) => {
      try { return name in self ? await fn() : 'unavailable'; } catch { return 'unavailable'; }
    };
    this.detectorStatus = await probe('LanguageDetector', () => LanguageDetector.availability());
    this.translatorStatus = await probe('Translator', () => Translator.availability({ sourceLanguage: 'fr', targetLanguage: 'en' }));
    this.summarizerStatus = await probe('Summarizer', () => Summarizer.availability());
    this.writerStatus = await probe('Writer', () => Writer.availability());
  }

  get statusPills() {
    return [
      { name: 'Language Detector', status: this.detectorStatus },
      { name: 'Translator', status: this.translatorStatus },
      { name: 'Semantic Embedder', status: this.embedderStatus },
      { name: 'Summarizer', status: this.summarizerStatus },
      { name: 'Writer', status: this.writerStatus }
    ];
  }

  get canProcess(): boolean {
    return !this.isProcessing
      && this.detectorStatus !== 'unavailable'
      && this.translatorStatus !== 'unavailable'
      && this.embedderStatus !== 'unavailable';
  }

  get canDigest(): boolean {
    return this.processed && !this.isDigesting && this.summarizerStatus !== 'unavailable';
  }

  get canReply(): boolean {
    return this.writerStatus !== 'unavailable';
  }

  languageName(code: string | null): string {
    if (!code) return 'unknown';
    return LANGUAGE_NAMES[code] ?? code;
  }

  folderByName(name: string | null): Folder | null {
    return this.folders.find(f => f.name === name) ?? null;
  }

  folderCount(folder: Folder): number {
    return this.inbox.filter(m => m.folder === folder.name).length;
  }

  stageIcon(message: InboxMessage, stage: 'detect' | 'translate' | 'triage'): string {
    const order: PipelineStage[] = ['detecting', 'translating', 'triaging'];
    const stageMap = { detect: 'detecting', translate: 'translating', triage: 'triaging' } as const;
    const target = stageMap[stage];
    if (message.stage === 'pending') return 'idle';
    if (message.stage === 'done') return 'done';
    if (message.stage === 'error') return 'error';
    const currentIdx = order.indexOf(message.stage);
    const targetIdx = order.indexOf(target);
    if (targetIdx < currentIdx) return 'done';
    if (targetIdx === currentIdx) return 'active';
    return 'idle';
  }

  async processInbox() {
    if (!this.canProcess) return;

    this.isProcessing = true;
    this.processed = false;
    this.errorMessage = '';
    this.digest = '';
    this.selectedMessage = null;
    this.reply = null;
    const totalStart = performance.now();

    try {
      // Prepare shared resources once.
      if (!this.detector) this.detector = await LanguageDetector.create();
      await this.prepareFolderCentroids();

      for (const message of this.inbox) {
        await this.processMessage(message);
      }

      this.totalPipelineMs = Math.round(performance.now() - totalStart);
      this.processed = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'The pipeline failed.';
    } finally {
      this.isProcessing = false;
    }
  }

  private async prepareFolderCentroids() {
    const allExamples = this.folders.flatMap(f => f.examples);
    const vectors = await this.semanticEmbedder.embed(allExamples, 'classification', this.onDownloadProgress);
    let cursor = 0;
    for (const folder of this.folders) {
      folder.centroid = this.semanticEmbedder.meanVector(vectors.slice(cursor, cursor + folder.examples.length));
      cursor += folder.examples.length;
    }
  }

  private async processMessage(message: InboxMessage) {
    const start = performance.now();
    try {
      // Stage 1: detect the sender's language
      message.stage = 'detecting';
      let language = 'en';
      const results = await this.detector.detect(message.body);
      if (results?.length && results[0].detectedLanguage !== 'und') {
        language = results[0].detectedLanguage;
        message.detectedLanguage = language;
        message.detectedConfidence = results[0].confidence;
      }

      // Stage 2: translate to English for the rest of the pipeline
      message.stage = 'translating';
      if (language === 'en') {
        message.english = message.body;
      } else {
        const key = `${language}->en`;
        if (!this.translators.has(key)) {
          this.translators.set(key, await Translator.create({ sourceLanguage: language, targetLanguage: 'en' }));
        }
        message.english = await this.translators.get(key).translate(message.body);
      }

      // Stage 3: triage into a folder by nearest centroid
      message.stage = 'triaging';
      const vector = await this.semanticEmbedder.embedOne(message.english!, 'classification');
      let best: { folder: Folder; score: number } | null = null;
      for (const folder of this.folders) {
        const score = this.semanticEmbedder.cosineSimilarity(vector, folder.centroid!);
        if (!best || score > best.score) best = { folder, score };
      }
      message.folder = best!.folder.name;
      message.folderScore = best!.score;

      message.stage = 'done';
      message.pipelineMs = Math.round(performance.now() - start);
    } catch (e: any) {
      message.stage = 'error';
      this.errorMessage = e.message || `Failed to process the message from ${message.sender}.`;
    }
  }

  async generateDigest() {
    if (!this.canDigest) return;
    this.isDigesting = true;
    this.errorMessage = '';
    try {
      const summarizer = await Summarizer.create({
        type: 'key-points',
        format: 'plain-text',
        length: 'medium'
      });
      const inboxText = this.inbox
        .filter(m => m.english)
        .map(m => `From ${m.sender} (${m.folder}): ${m.english}`)
        .join('\n');
      this.digest = await summarizer.summarize(inboxText, {
        context: 'These are customer messages received today by the Nimbus support team.'
      });
      summarizer.destroy?.();
    } catch (e: any) {
      this.errorMessage = e.message || 'Could not generate the digest.';
    } finally {
      this.isDigesting = false;
    }
  }

  selectMessage(message: InboxMessage) {
    if (message.stage !== 'done') return;
    this.selectedMessage = message;
    this.reply = null;
  }

  async draftReply(tone: 'formal' | 'neutral' | 'casual') {
    const message = this.selectedMessage;
    if (!message || !message.english || !this.canReply) return;

    this.reply = { tone, english: '', translated: null, targetLanguage: message.detectedLanguage, isDrafting: true, showEnglish: false };
    this.errorMessage = '';

    try {
      // Draft in English with the Writer API...
      const writer = await Writer.create({
        tone,
        format: 'plain-text',
        length: 'short',
        sharedContext: 'You write replies on behalf of the Nimbus support team. Be helpful and specific, never invent account details, and sign off as "The Nimbus Team".'
      });
      const english = await writer.write(
        `Reply to this customer message, filed under "${message.folder}": "${message.english}"`
      );
      writer.destroy?.();
      this.reply.english = english;

      // ...then answer the customer in THEIR language.
      const language = message.detectedLanguage;
      if (language && language !== 'en') {
        const key = `en->${language}`;
        if (!this.translators.has(key)) {
          this.translators.set(key, await Translator.create({ sourceLanguage: 'en', targetLanguage: language }));
        }
        this.reply.translated = await this.translators.get(key).translate(english);
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Could not draft the reply.';
      this.reply = null;
    } finally {
      if (this.reply) this.reply.isDrafting = false;
    }
  }

  get dynamicCodeSnippet(): string {
    return this.demo.codeSnippet;
  }
}
