import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    reasoning: { type: 'string' }
  },
  required: ['answer', 'reasoning'],
  additionalProperties: false
};

const SAMPLE_CSV = `date,region,product,units,revenue
2026-06-02,Europe,Falcon Drone,12,14400
2026-06-05,Americas,Falcon Drone,8,9600
2026-06-09,Asia,Comet Camera,25,11250
2026-06-11,Europe,Comet Camera,18,8100
2026-06-14,Americas,Nimbus Speaker,40,7200
2026-06-17,Asia,Falcon Drone,15,18000
2026-06-20,Europe,Nimbus Speaker,22,3960
2026-06-23,Americas,Comet Camera,30,13500
2026-06-26,Asia,Nimbus Speaker,55,9900
2026-06-28,Europe,Falcon Drone,9,10800
2026-07-01,Americas,Falcon Drone,14,16800
2026-07-03,Asia,Comet Camera,20,9000`;

@Component({
  selector: 'app-csv-qa-demo',
  templateUrl: './csv-qa-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class CsvQaDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'csv-qa')!;

  csvText = SAMPLE_CSV;
  question = '';
  answer = '';
  reasoning = '';
  errorMessage = '';
  showData = true;

  sampleQuestions = [
    'Which region had the highest total revenue?',
    'What is the total revenue for the Falcon Drone?',
    'Which product sold the most units overall?',
    'What was the average revenue per order in June?'
  ];

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkAvailability();
  }

  get statusPills() {
    return [{ name: 'Prompt API', status: this.languageModelAvailability }];
  }

  get parsedRows(): string[][] {
    return this.csvText
      .trim()
      .split('\n')
      .map(line => line.split(',').map(cell => cell.trim()))
      .filter(row => row.length > 1);
  }

  get headerRow(): string[] {
    return this.parsedRows[0] ?? [];
  }

  get dataRows(): string[][] {
    return this.parsedRows.slice(1);
  }

  useSample(sample: string) {
    this.question = sample;
    this.ask();
  }

  async ask() {
    const question = this.question.trim();
    if (!question || !this.csvText.trim() || this.state === PromptInputStateEnum.Inferencing) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    this.state = PromptInputStateEnum.Inferencing;
    this.answer = '';
    this.reasoning = '';
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    const startTime = performance.now();

    try {
      const session = await LanguageModel.create({
        systemPrompt:
          'You answer questions about CSV data accurately and carefully. ' +
          'Work through the relevant rows step by step in the reasoning field, showing the numbers you add up. ' +
          'Keep the answer field short and direct.'
      });

      const response = await session.prompt(
        `CSV data:\n${this.csvText.trim()}\n\nQuestion: ${question}`,
        { responseConstraint: ANSWER_SCHEMA, signal: this.abortController.signal }
      );
      session.destroy?.();

      this.totalTime = Math.round(performance.now() - startTime);
      this.ttft = this.totalTime;

      const result = JSON.parse(response);
      this.answer = result.answer;
      this.reasoning = result.reasoning;
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Could not answer the question.';
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  get dynamicCodeSnippet(): string {
    const question = this.question.trim() || this.sampleQuestions[0];
    return `const schema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    reasoning: { type: "string" }
  },
  required: ["answer", "reasoning"],
  additionalProperties: false
};

const session = await LanguageModel.create({
  systemPrompt: "You answer questions about CSV data accurately. " +
    "Show your calculation in the reasoning field."
});

// ${this.dataRows.length} rows of private business data — never uploaded
const result = await session.prompt(
  \`CSV data:\\n\${csvText}\\n\\nQuestion: ${question.replace(/`/g, '')}\`,
  { responseConstraint: schema }
);

const { answer, reasoning } = JSON.parse(result);${this.answer ? `\n// answer: "${this.answer.slice(0, 80).replace(/"/g, '\\"')}${this.answer.length > 80 ? '…' : ''}"` : ''}`;
  }
}
