import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseSpeechDemoComponent } from '../components/base-demo/base-speech-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';

declare const Proofreader: any;
declare const Rewriter: any;

interface PolishAction {
  id: string;
  label: string;
  icon: string;
  api: 'Proofreader' | 'Rewriter';
  tone?: 'more-formal' | 'more-casual';
  length?: 'shorter' | 'longer';
}

const ACTIONS: PolishAction[] = [
  { id: 'proofread', label: 'Fix grammar & punctuation', icon: 'bi-patch-check', api: 'Proofreader' },
  { id: 'formal', label: 'Make it formal', icon: 'bi-briefcase', api: 'Rewriter', tone: 'more-formal' },
  { id: 'casual', label: 'Make it casual', icon: 'bi-emoji-smile', api: 'Rewriter', tone: 'more-casual' },
  { id: 'shorter', label: 'Tighten it up', icon: 'bi-arrows-collapse', api: 'Rewriter', length: 'shorter' }
];

@Component({
  selector: 'app-dictate-and-polish-demo',
  templateUrl: './dictate-and-polish-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class DictateAndPolishDemoComponent extends BaseSpeechDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'dictate-and-polish')!;

  actions = ACTIONS;

  rawText = '';
  interim = '';
  polishedText = '';
  activeAction: PolishAction | null = null;
  isPolishing = false;
  polishTimeMs: number | null = null;

  proofreaderStatus = 'loading...';
  rewriterStatus = 'loading...';

  sampleDictation =
    'so um basically the idea is we take the quarterly numbers right and we put them in like a dashboard thing ' +
    'so everyone can see them without asking me every time and also i think we should probably automate the report ' +
    'because doing it by hand every month is honestly kind of a waste of my time';

  private proofreader: any = null;
  private rewriters = new Map<string, any>();

  /** Text dictated before the current recognition session started. */
  private sessionBase = '';

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;

    await this.checkSpeechAvailability({ quality: 'dictation' });

    try {
      this.proofreaderStatus = 'Proofreader' in self ? await Proofreader.availability() : 'unavailable';
    } catch { this.proofreaderStatus = 'unavailable'; }
    try {
      this.rewriterStatus = 'Rewriter' in self ? await Rewriter.availability() : 'unavailable';
    } catch { this.rewriterStatus = 'unavailable'; }
  }

  get statusPills() {
    return [
      { name: 'Web Speech (on-device)', status: this.speechStatus },
      { name: 'Proofreader', status: this.proofreaderStatus },
      { name: 'Rewriter', status: this.rewriterStatus }
    ];
  }

  actionAvailable(action: PolishAction): boolean {
    return action.api === 'Proofreader'
      ? this.proofreaderStatus !== 'unavailable'
      : this.rewriterStatus !== 'unavailable';
  }

  startDictation() {
    if (this.isListening || this.speechStatus !== 'available') return;

    this.errorMessage = '';
    try {
      this.recognition = this.webSpeech.createRecognizer({
        quality: 'dictation',
        continuous: true,
        interimResults: true
      });
    } catch (e: any) {
      this.errorMessage = e.message;
      return;
    }

    const r = this.recognition;
    this.isListening = true;

    r.onresult = (event: any) => this.ngZone.run(() => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + ' ';
        else interim += transcript;
      }
      // Each recognition session resets the results list, so append to prior sessions.
      if (finalText.trim()) this.rawText = this.mergeTranscript(finalText.trim());
      this.interim = interim;
    });

    r.onerror = (event: any) => this.ngZone.run(() => {
      this.errorMessage = event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow the mic to dictate.'
        : `Recognition error: ${event.error}`;
    });

    r.onend = () => this.ngZone.run(() => {
      this.isListening = false;
      this.interim = '';
      this.recognition = null;
    });

    this.sessionBase = this.rawText;
    r.start();
  }

  private mergeTranscript(sessionFinal: string): string {
    return (this.sessionBase ? this.sessionBase + ' ' : '') + sessionFinal;
  }

  stopDictation() {
    this.stopRecognition();
  }

  useSample() {
    this.rawText = this.sampleDictation;
    this.polishedText = '';
    this.activeAction = null;
  }

  clearAll() {
    this.rawText = '';
    this.polishedText = '';
    this.interim = '';
    this.activeAction = null;
    this.polishTimeMs = null;
  }

  async polish(action: PolishAction) {
    const input = this.rawText.trim();
    if (!input || this.isPolishing || !this.actionAvailable(action)) return;

    this.isPolishing = true;
    this.activeAction = action;
    this.errorMessage = '';
    this.polishedText = '';
    const start = performance.now();

    try {
      if (action.api === 'Proofreader') {
        if (!this.proofreader) {
          this.proofreader = await Proofreader.create({ expectedInputLanguages: ['en'] });
        }
        const result = await this.proofreader.proofread(input);
        this.polishedText = result.correctedInput ?? result.correction ?? input;
      } else {
        const key = `${action.tone ?? 'as-is'}|${action.length ?? 'as-is'}`;
        if (!this.rewriters.has(key)) {
          this.rewriters.set(key, await Rewriter.create({
            tone: action.tone ?? 'as-is',
            length: action.length ?? 'as-is',
            format: 'plain-text'
          }));
        }
        this.polishedText = await this.rewriters.get(key).rewrite(input);
      }
      this.polishTimeMs = Math.round(performance.now() - start);
    } catch (e: any) {
      this.errorMessage = e.message || 'Polishing failed.';
    } finally {
      this.isPolishing = false;
    }
  }

  /** Promote the polished text to be the new working draft. */
  keepPolished() {
    if (!this.polishedText) return;
    this.rawText = this.polishedText;
    this.polishedText = '';
    this.activeAction = null;
  }

  override ngOnDestroy() {
    this.proofreader?.destroy?.();
    this.rewriters.forEach(rewriter => rewriter.destroy?.());
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    const action = this.activeAction ?? ACTIONS[0];
    let polishCode: string;
    if (action.api === 'Proofreader') {
      polishCode = `const proofreader = await Proofreader.create({ expectedInputLanguages: ["en"] });
const { correctedInput } = await proofreader.proofread(rawTranscript);`;
    } else {
      polishCode = `const rewriter = await Rewriter.create({
  tone: "${action.tone ?? 'as-is'}",
  length: "${action.length ?? 'as-is'}",
  format: "plain-text"
});
const polished = await rewriter.rewrite(rawTranscript);`;
    }
    return `// 1. Dictate on-device — speech never leaves the machine
const recognition = new SpeechRecognition();
recognition.options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
recognition.continuous = true;
recognition.interimResults = true;
recognition.onresult = (e) => (rawTranscript = collectFinalResults(e));
recognition.start();

// 2. Polish the raw transcript ("${action.label}")
${polishCode}`;
  }
}
