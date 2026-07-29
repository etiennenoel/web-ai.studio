import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseSpeechDemoComponent } from '../components/base-demo/base-speech-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

interface BookingForm {
  name: string | null;
  date: string | null;
  time: string | null;
  partySize: number | null;
  seating: 'inside' | 'outside' | null;
  specialRequests: string | null;
}

const BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: ['string', 'null'] },
    date: { type: ['string', 'null'] },
    time: { type: ['string', 'null'] },
    partySize: { type: ['number', 'null'] },
    seating: { type: ['string', 'null'], enum: ['inside', 'outside', null] },
    specialRequests: { type: ['string', 'null'] }
  },
  required: ['name', 'date', 'time', 'partySize', 'seating', 'specialRequests'],
  additionalProperties: false
};

@Component({
  selector: 'app-speak-to-fill-demo',
  templateUrl: './speak-to-fill-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SpeakToFillDemoComponent extends BaseSpeechDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'speak-to-fill')!;

  form: BookingForm = { name: null, date: null, time: null, partySize: null, seating: null, specialRequests: null };
  recentlyUpdated = new Set<keyof BookingForm>();

  transcript = '';
  interim = '';
  typedUtterance = '';
  isExtracting = false;

  sampleUtterances = [
    'Book a table for four next Friday at 7 pm, outside if possible, under the name Martin.',
    'Actually make that six people at 8 o\'clock instead.',
    'We\'ll need a high chair for a toddler, and my name is spelled M-A-R-T-Y-N.'
  ];

  private abortListen: (() => void) | null = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkSpeechAvailability({ quality: 'dictation' });
    await this.checkAvailability();
  }

  get statusPills() {
    return [
      { name: 'Web Speech (on-device)', status: this.speechStatus },
      { name: 'Prompt API', status: this.languageModelAvailability }
    ];
  }

  get formFields(): { key: keyof BookingForm; label: string; icon: string }[] {
    return [
      { key: 'name', label: 'Name', icon: 'bi-person' },
      { key: 'date', label: 'Date', icon: 'bi-calendar-event' },
      { key: 'time', label: 'Time', icon: 'bi-clock' },
      { key: 'partySize', label: 'Party size', icon: 'bi-people' },
      { key: 'seating', label: 'Seating', icon: 'bi-tree' },
      { key: 'specialRequests', label: 'Special requests', icon: 'bi-chat-left-text' }
    ];
  }

  async listen() {
    if (this.isListening || this.speechStatus !== 'available') return;

    this.errorMessage = '';
    this.transcript = '';
    this.interim = '';
    this.isListening = true;

    try {
      const { result, abort } = this.webSpeech.listenOnce(
        { quality: 'dictation' },
        interim => { this.interim = interim; }
      );
      this.abortListen = abort;

      const transcript = await result;
      this.interim = '';
      this.isListening = false;
      this.abortListen = null;

      if (transcript) {
        this.transcript = transcript;
        await this.extract(transcript);
      }
    } catch (e: any) {
      this.isListening = false;
      this.interim = '';
      this.abortListen = null;
      this.errorMessage = e.message || 'Could not capture speech.';
    }
  }

  cancelListening() {
    this.abortListen?.();
  }

  async extractTyped() {
    const utterance = this.typedUtterance.trim();
    if (!utterance) return;
    this.transcript = utterance;
    await this.extract(utterance);
  }

  useSample(sample: string) {
    this.typedUtterance = sample;
    this.extractTyped();
  }

  resetForm() {
    this.form = { name: null, date: null, time: null, partySize: null, seating: null, specialRequests: null };
    this.recentlyUpdated.clear();
    this.transcript = '';
    this.typedUtterance = '';
  }

  private async extract(utterance: string) {
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable — cannot extract form fields.';
      return;
    }

    this.isExtracting = true;
    this.state = PromptInputStateEnum.Inferencing;
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    const startTime = performance.now();

    try {
      const session = await LanguageModel.create({
        systemPrompt:
          'You extract restaurant booking details from spoken utterances. ' +
          `Today is ${new Date().toDateString()}. ` +
          'The current form state is provided; the utterance may fill new fields or correct existing ones. ' +
          'Return the COMPLETE updated form. Use null for fields that remain unknown. ' +
          'Format dates like "Friday, August 7" and times like "7:00 PM".'
      });

      const response = await session.prompt(
        `Current form: ${JSON.stringify(this.form)}\n\nUtterance: "${utterance}"`,
        { responseConstraint: BOOKING_SCHEMA }
      );
      session.destroy?.();

      const updated = JSON.parse(response) as BookingForm;
      this.recentlyUpdated.clear();
      (Object.keys(updated) as (keyof BookingForm)[]).forEach(key => {
        if (updated[key] !== null && updated[key] !== this.form[key]) {
          this.recentlyUpdated.add(key);
          (this.form as any)[key] = updated[key];
        }
      });

      this.totalTime = Math.round(performance.now() - startTime);
      this.ttft = this.totalTime;
    } catch (e: any) {
      this.errorMessage = e.message || 'Extraction failed.';
    } finally {
      this.isExtracting = false;
      this.state = PromptInputStateEnum.Ready;
    }
  }

  displayValue(key: keyof BookingForm): string {
    const value = this.form[key];
    if (value === null || value === '') return '';
    return String(value);
  }

  get dynamicCodeSnippet(): string {
    const utterance = this.transcript || this.sampleUtterances[0];
    return `// 1. Capture one utterance on-device
const recognition = new SpeechRecognition();
recognition.options = { langs: ["en-US"], processLocally: true, quality: "dictation" };
recognition.onresult = (e) => extract(e.results[0][0].transcript);
recognition.start();

// 2. Turn the transcript into structured form data
const schema = ${JSON.stringify(BOOKING_SCHEMA, null, 2)};

async function extract(utterance) {
  // e.g. ${JSON.stringify(utterance)}
  const session = await LanguageModel.create({
    systemPrompt: "You extract restaurant booking details. " +
      "Return the complete updated form; null for unknown fields. " +
      "Today is " + new Date().toDateString()
  });
  const result = await session.prompt(
    \`Current form: \${JSON.stringify(currentForm)}\\n\\nUtterance: "\${utterance}"\`,
    { responseConstraint: schema }
  );
  applyToForm(JSON.parse(result)); // only non-null fields overwrite
}`;
  }
}
