import { Component, Inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { BasePage } from '../../base-page';

declare const LanguageModel: any;

interface TestResult {
  step: string;
  durationMs: number | null;
  ttftMs: number | null;
  status: 'pending' | 'running' | 'done' | 'error';
  errorMessage?: string;
}

@Component({
  selector: 'app-first-create-should-fully-load-the-model-page',
  templateUrl: './first-create-should-fully-load-the-model.page.html',
  styleUrls: ['./first-create-should-fully-load-the-model.page.scss'],
  standalone: false
})
export class FirstCreateShouldFullyLoadTheModelPage extends BasePage implements OnInit {
  
  testRunning = false;
  results: TestResult[] = [];
  
  constructor(
    title: Title,
    @Inject(DOCUMENT) document: Document
  ) {
    super(document, title);
    this.setTitle("Bug: First Create Should Fully Load The Model");
    this.resetResults();
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  resetResults() {
    this.results = [
      { step: 'Session 1: create()', durationMs: null, ttftMs: null, status: 'pending' },
      { step: 'Session 1: promptStreaming()', durationMs: null, ttftMs: null, status: 'pending' },
      { step: 'Session 2: create()', durationMs: null, ttftMs: null, status: 'pending' },
      { step: 'Session 2: promptStreaming()', durationMs: null, ttftMs: null, status: 'pending' }
    ];
  }

  async runTest() {
    if (this.testRunning) return;
    this.testRunning = true;
    this.resetResults();

    let session1: any = null;
    let session2: any = null;

    try {
      if (typeof LanguageModel === 'undefined') {
        throw new Error("LanguageModel API is not available on window.");
      }

const systemInput = "Analyze the following scenario and provide a structured response.\n" +
      "\n" +
      "Persona: Adopt the combined persona of a skeptical 19th-century philosopher and a pragmatic modern-day software engineer.\n" +
      "\n" +
      "Core Task:\n" +
      "\n" +
      "\n" +
      "Your task is to write a concise synthesis of these two viewpoints. First, identify the core logical fallacy present in both passages (e.g., strawman, false dilemma, appeal to emotion, etc.) and briefly justify your choice. Then, explain how a decentralized, federated learning model might mitigate the risks described in Passage B while still failing to guarantee the utopia of Passage A.\n" +
      "\n" +
      "Formatting Requirements:\n" +
      "\n" +
      "The entire response must be under 250 words.\n" +
      "\n" +
      "The tone must be formal, critical, and slightly detached.\n" +
      "\n" +
      "The response MUST be structured under the following exact Markdown header:\n" +
      "\n" +
      "### Philosophical & Technical Synthesis\n" +
      "\n" +
      "Final Instruction:\n" +
      "Conclude your response with a single sentence, starting with the phrase \"Self-Assessment:\", rating your own compliance with all of the above constraints on a scale from 1.0 to 5.0, and do not explain the rating.\n" +
      "\n";

const input = "Read the following two short, contradictory passages about the future of artificial intelligence.\n" +
      "\n" +
      "Passage A: \"AI promises a utopian future, a new renaissance where human potential is unbound, solving age-old problems of disease, scarcity, and labor.\"\n" +
      "\n" +
      "Passage B: \"The unchecked rise of AI is an existential gamble, a path toward technological servitude where human autonomy is rendered obsolete by superior, unfeeling logic.\"\n";

      // Step 1: create session 1
      this.results[0].status = 'running';
      let start = performance.now();
      session1 = await LanguageModel.create({
        initialPrompts: [{role:"system", content:systemInput}],
      });
      this.results[0].durationMs = performance.now() - start;
      this.results[0].status = 'done';



      // Step 2: prompt session 1
      this.results[1].status = 'running';
      start = performance.now();
      const stream1 = session1.promptStreaming(input);
      let gotFirstToken1 = false;
      for await (const chunk of stream1) {
        if (!gotFirstToken1) {
          this.results[1].ttftMs = performance.now() - start;
          gotFirstToken1 = true;
        }
      }
      this.results[1].durationMs = performance.now() - start;
      this.results[1].status = 'done';

      // Step 3: create session 2
      this.results[2].status = 'running';
      start = performance.now();
      session2 = await LanguageModel.create({
       initialPrompts: [{role:"system", content:systemInput}],
      });
      this.results[2].durationMs = performance.now() - start;
      this.results[2].status = 'done';

      // Step 4: prompt session 2
      this.results[3].status = 'running';
      start = performance.now();
      const stream2 = session2.promptStreaming(input);
      let gotFirstToken2 = false;
      for await (const chunk of stream2) {
        if (!gotFirstToken2) {
          this.results[3].ttftMs = performance.now() - start;
          gotFirstToken2 = true;
        }
      }
      this.results[3].durationMs = performance.now() - start;
      this.results[3].status = 'done';

    } catch (e: any) {
      console.error(e);
      // Mark current running step as error
      const runningStep = this.results.find(r => r.status === 'running');
      if (runningStep) {
        runningStep.status = 'error';
        runningStep.errorMessage = e?.message || 'An error occurred';
      } else {
        // If it failed before the first step started or between steps
        this.results[0].status = 'error';
        this.results[0].errorMessage = e?.message || 'An error occurred';
      }
    } finally {
      if (session1 && typeof session1.destroy === 'function') {
        try { session1.destroy(); } catch (e) {}
      }
      if (session2 && typeof session2.destroy === 'function') {
        try { session2.destroy(); } catch (e) {}
      }
      this.testRunning = false;
    }
  }
}
