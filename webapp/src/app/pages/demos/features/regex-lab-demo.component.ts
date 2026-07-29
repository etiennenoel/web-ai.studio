import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

interface TestSegment {
  text: string;
  isMatch: boolean;
}

interface MatchDetail {
  match: string;
  index: number;
  groups: string[];
}

const REGEX_SCHEMA = {
  type: 'object',
  properties: {
    pattern: { type: 'string' },
    flags: { type: 'string' },
    explanation: { type: 'string' }
  },
  required: ['pattern', 'flags', 'explanation'],
  additionalProperties: false
};

const SAMPLE_TEST_STRING = `Contact us at support@example.com or sales@webai.studio for help.
The launch is planned for 2026-07-29, with a fallback on 2026-08-15.
Call +1 (555) 123-4567 or 555-987-6543 before 5pm.
Brand colors: #4f46e5, #10b981 and #FFF.
This this sentence has has some duplicate words words.`;

@Component({
  selector: 'app-regex-lab-demo',
  templateUrl: './regex-lab-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class RegexLabDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'regex-lab')!;

  description = '';
  pattern = '';
  flags = 'g';
  explanation = '';
  testString = SAMPLE_TEST_STRING;

  segments: TestSegment[] = [];
  matches: MatchDetail[] = [];
  regexError = '';
  errorMessage = '';
  hasGenerated = false;

  sampleRequests = [
    'match email addresses',
    'ISO dates like 2026-07-29',
    'US phone numbers in any common format',
    'hex color codes',
    'the same word repeated twice in a row'
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

  useSample(sample: string) {
    this.description = sample;
    this.generate();
  }

  async generate() {
    const description = this.description.trim();
    if (!description || this.state === PromptInputStateEnum.Inferencing) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    this.state = PromptInputStateEnum.Inferencing;
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();
    const startTime = performance.now();

    try {
      const session = await LanguageModel.create({
        systemPrompt:
          'You write JavaScript regular expressions. Return the pattern WITHOUT surrounding slashes. ' +
          'Prefer readable, robust patterns over clever ones. Explain the pattern in one or two plain sentences.'
      });

      const response = await session.prompt(
        `Write a regex that matches: ${description}`,
        { responseConstraint: REGEX_SCHEMA, signal: this.abortController.signal }
      );
      session.destroy?.();

      this.totalTime = Math.round(performance.now() - startTime);
      this.ttft = this.totalTime;

      const result = JSON.parse(response);
      this.pattern = result.pattern;
      this.flags = result.flags || 'g';
      this.explanation = result.explanation;
      this.hasGenerated = true;
      this.runTest();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Could not generate the regex.';
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  /** Rebuilds the highlighted segments from the current pattern, flags, and test string. */
  runTest() {
    this.regexError = '';
    this.segments = [];
    this.matches = [];

    const pattern = this.pattern.trim();
    if (!pattern || !this.testString) return;

    let regex: RegExp;
    try {
      // Matching requires the global flag; add it without mutating the displayed flags.
      const flags = this.flags.includes('g') ? this.flags : this.flags + 'g';
      regex = new RegExp(pattern, flags);
    } catch (e: any) {
      this.regexError = e.message;
      this.segments = [{ text: this.testString, isMatch: false }];
      return;
    }

    let cursor = 0;
    for (const match of this.testString.matchAll(regex)) {
      const index = match.index ?? 0;
      if (match[0].length === 0) break; // guard against zero-length match loops
      if (index > cursor) {
        this.segments.push({ text: this.testString.slice(cursor, index), isMatch: false });
      }
      this.segments.push({ text: match[0], isMatch: true });
      this.matches.push({ match: match[0], index, groups: match.slice(1).map(g => g ?? '') });
      cursor = index + match[0].length;
      if (this.matches.length >= 200) break;
    }
    if (cursor < this.testString.length) {
      this.segments.push({ text: this.testString.slice(cursor), isMatch: false });
    }
  }

  get dynamicCodeSnippet(): string {
    const description = this.description.trim() || this.sampleRequests[0];
    return `const schema = {
  type: "object",
  properties: {
    pattern: { type: "string" },
    flags: { type: "string" },
    explanation: { type: "string" }
  },
  required: ["pattern", "flags", "explanation"],
  additionalProperties: false
};

const session = await LanguageModel.create({
  systemPrompt: "You write JavaScript regular expressions. " +
    "Return the pattern WITHOUT surrounding slashes."
});

const result = await session.prompt(
  ${JSON.stringify('Write a regex that matches: ' + description)},
  { responseConstraint: schema }
);

const { pattern, flags, explanation } = JSON.parse(result);
${this.hasGenerated ? `// → /${this.pattern}/${this.flags}` : ''}
const regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");

for (const match of testString.matchAll(regex)) {
  highlight(match.index, match[0]); ${this.matches.length ? `// ${this.matches.length} matches in the tester below` : ''}
}`;
  }
}
