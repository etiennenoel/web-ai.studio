import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { BasePage } from '../../base-page';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const Writer: any;

type WriterTone = 'formal' | 'neutral' | 'casual';
type WriterLength = 'short' | 'medium' | 'long';

interface IncomingEmail {
  from: string;
  subject: string;
  body: string;
}

interface ReplyIntent {
  label: string;
  icon: string;
  task: string;
}

const EMAILS: IncomingEmail[] = [
  {
    from: 'Nadia Osei — Horizon Conf',
    subject: 'Speaking invitation: Horizon Conf 2026',
    body: 'Hi! We would love to have you speak at Horizon Conf this November in Lisbon. It is a 30-minute slot on the main stage about on-device AI in the browser. We cover travel and accommodation. Could you let us know by Friday whether you are interested?'
  },
  {
    from: 'Tom Delacroix — Vantage Ventures',
    subject: 'Quick call next week?',
    body: 'Hey, I have been following your work on browser AI and I think there is a very interesting investment angle here. Would you have 30 minutes next week for a quick call? I am flexible on timing — happy to work around your schedule.'
  },
  {
    from: 'Rachel Kim — Product',
    subject: 'Can we ship the beta this Friday?',
    body: 'The team is pushing to release the beta this Friday, but QA has only covered about half the test matrix. I know marketing already announced the date. What do you want to do — ship with known gaps, or slip a week and take the heat?'
  }
];

const INTENTS: ReplyIntent[] = [
  { label: 'Accept', icon: 'bi-check-circle', task: 'Write a reply that warmly accepts the proposal and asks about the practical next steps.' },
  { label: 'Decline politely', icon: 'bi-x-circle', task: 'Write a reply that politely declines, gives a brief credible reason, and leaves the door open for the future.' },
  { label: 'Ask for more time', icon: 'bi-hourglass-split', task: 'Write a reply that asks for a few more days to decide, states when a final answer will come, and thanks them for their patience.' },
  { label: 'Request details', icon: 'bi-question-circle', task: 'Write a reply that asks two or three sharp clarifying questions needed before a decision can be made.' }
];

@Component({
  selector: 'app-reply-composer-demo',
  templateUrl: './reply-composer-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class ReplyComposerDemoComponent extends BasePage implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'reply-composer')!;

  emails = EMAILS;
  intents = INTENTS;

  selectedEmail = EMAILS[0];
  selectedIntent: ReplyIntent | null = null;
  tone: WriterTone = 'neutral';
  length: WriterLength = 'short';

  writerStatus = 'loading...';
  errorMessage = '';
  draft = '';
  isWriting = false;
  ttft: number | null = null;
  totalTime: number | null = null;

  private abortController: AbortController | null = null;

  constructor(
    @Inject(DOCUMENT) document: Document,
    title: Title,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    super(document, title);
  }

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    try {
      this.writerStatus = 'Writer' in self ? await Writer.availability() : 'unavailable';
    } catch {
      this.writerStatus = 'unavailable';
    }
  }

  selectEmail(email: IncomingEmail) {
    this.selectedEmail = email;
    this.draft = '';
    this.selectedIntent = null;
  }

  async compose(intent: ReplyIntent) {
    if (this.isWriting || this.writerStatus === 'unavailable') return;

    this.selectedIntent = intent;
    this.isWriting = true;
    this.errorMessage = '';
    this.draft = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      const writer = await Writer.create({
        tone: this.tone,
        length: this.length,
        format: 'plain-text',
        sharedContext: `You are replying to this email from ${this.selectedEmail.from} with the subject "${this.selectedEmail.subject}":\n\n${this.selectedEmail.body}`
      });

      const stream = writer.writeStreaming(intent.task, { signal: this.abortController.signal });
      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.draft += chunk;
      }
      this.totalTime = Math.round(performance.now() - startTime);
      writer.destroy?.();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Could not draft the reply.';
      }
    } finally {
      this.isWriting = false;
      this.abortController = null;
    }
  }

  cancel() {
    this.abortController?.abort();
  }

  get dynamicCodeSnippet(): string {
    const intent = this.selectedIntent ?? INTENTS[1];
    return `const writer = await Writer.create({
  tone: "${this.tone}",              // formal | neutral | casual
  length: "${this.length}",            // short | medium | long
  format: "plain-text",

  // The email being replied to is context, not the writing task
  sharedContext: \`You are replying to this email from ${this.selectedEmail.from}:
${this.selectedEmail.body.slice(0, 90)}…\`
});

// The intent is the task
const stream = writer.writeStreaming(
  ${JSON.stringify(intent.task)}
);

for await (const chunk of stream) {
  draft += chunk;
}

writer.destroy();`;
  }
}
