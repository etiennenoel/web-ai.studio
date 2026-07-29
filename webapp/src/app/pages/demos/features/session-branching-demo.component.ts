import { Component, OnInit } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

interface Branch {
  label: string;
  icon: string;
  accentClass: string;
  prompt: string;
  response: string;
  isStreaming: boolean;
  timeMs: number | null;
}

@Component({
  selector: 'app-session-branching-demo',
  templateUrl: './session-branching-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class SessionBranchingDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'session-branching')!;

  basePrompt = 'We\'re naming a new open-source library for on-device AI benchmarks. Suggest one name and explain it in two sentences.';
  baseResponse = '';
  isBaseStreaming = false;
  baseDone = false;
  errorMessage = '';

  branches: Branch[] = [
    {
      label: 'The Optimist',
      icon: 'bi-sun',
      accentClass: 'emerald',
      prompt: 'Build on your suggestion enthusiastically. What makes it great, and what should we do next?',
      response: '',
      isStreaming: false,
      timeMs: null
    },
    {
      label: 'The Skeptic',
      icon: 'bi-cloud-lightning',
      accentClass: 'rose',
      prompt: 'Now be brutally honest about your own suggestion. What is wrong with it, and what would be better?',
      response: '',
      isStreaming: false,
      timeMs: null
    }
  ];

  branchesRunning = false;
  branchesDone = false;

  private baseSession: any = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkAvailability();
  }

  get statusPills() {
    return [{ name: 'Prompt API', status: this.languageModelAvailability }];
  }

  async runBase() {
    const prompt = this.basePrompt.trim();
    if (!prompt || this.isBaseStreaming || this.branchesRunning) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    this.isBaseStreaming = true;
    this.baseDone = false;
    this.branchesDone = false;
    this.errorMessage = '';
    this.baseResponse = '';
    this.branches.forEach(branch => {
      branch.response = '';
      branch.timeMs = null;
    });
    this.abortController = new AbortController();

    try {
      this.baseSession?.destroy?.();
      this.baseSession = await LanguageModel.create();

      const stream = this.baseSession.promptStreaming(prompt, { signal: this.abortController.signal });
      for await (const chunk of stream) {
        this.baseResponse += chunk;
      }
      this.baseDone = true;
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'The base prompt failed.';
      }
    } finally {
      this.isBaseStreaming = false;
      this.abortController = null;
    }
  }

  async fork() {
    if (!this.baseDone || this.branchesRunning || !this.baseSession) return;

    this.branchesRunning = true;
    this.branchesDone = false;
    this.errorMessage = '';
    this.branches.forEach(branch => {
      branch.response = '';
      branch.timeMs = null;
      branch.isStreaming = true;
    });

    try {
      // Both branches stream concurrently, each from its own clone of the
      // shared context — the base session itself stays untouched.
      await Promise.all(this.branches.map(branch => this.runBranch(branch)));
      this.branchesDone = true;
    } catch (e: any) {
      this.errorMessage = e.message || 'Branching failed.';
    } finally {
      this.branchesRunning = false;
      this.branches.forEach(branch => (branch.isStreaming = false));
    }
  }

  private async runBranch(branch: Branch) {
    const start = performance.now();
    try {
      const clone = await this.baseSession.clone();
      const stream = clone.promptStreaming(branch.prompt);
      for await (const chunk of stream) {
        branch.response += chunk;
      }
      branch.timeMs = Math.round(performance.now() - start);
      clone.destroy?.();
    } catch (e: any) {
      branch.response = branch.response || `[${e.message}]`;
    } finally {
      branch.isStreaming = false;
    }
  }

  cancel() {
    this.abortController?.abort();
  }

  override ngOnDestroy() {
    this.baseSession?.destroy?.();
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    return `const session = await LanguageModel.create();

// Build up shared context once
const base = await session.prompt(
  ${JSON.stringify(this.basePrompt.trim() || 'Suggest a name for the library.')}
);

// Fork the conversation — each clone inherits the FULL history
// without re-processing a single token of it
const optimist = await session.clone();
const skeptic = await session.clone();

// The branches diverge from the same starting point, in parallel
const [praise, critique] = await Promise.all([
  optimist.prompt(${JSON.stringify(this.branches[0].prompt)}),
  skeptic.prompt(${JSON.stringify(this.branches[1].prompt)})
]);

// The original session is untouched by either branch —
// you can keep prompting it, or fork it again
optimist.destroy();
skeptic.destroy();`;
  }
}
