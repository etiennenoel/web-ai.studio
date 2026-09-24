import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import {
  ClassifierService,
  ClassifierSchema,
  ClassifierQuestion,
  NormalizedClassifierResult
} from '../../../core/services/classifier.service';

@Component({
  selector: 'app-classifier-playground',
  templateUrl: './classifier.page.html',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' }
})
export class ClassifierPlaygroundPage implements OnInit, OnDestroy {
  schemaEditorMode: 'visual' | 'json' = 'visual';

  schema: ClassifierSchema = {
    context: 'Enterprise customer support ticket router.',
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    questions: [
      {
        id: 'is_urgent',
        type: 'binary',
        prompt: 'Does this ticket require immediate incident response?'
      },
      {
        id: 'category',
        type: 'categorical',
        prompt: 'Select the primary support department.',
        options: [
          { label: 'bug', description: 'Production crash or software defect' },
          { label: 'billing', description: 'Invoice or double-charge issue' },
          { label: 'feature_request', description: 'Enhancement request' }
        ]
      },
      {
        id: 'severity',
        type: 'ordinal',
        prompt: 'Rate the business impact from 1 (minimal) to 5 (critical).',
        options: [
          { label: '1', description: 'Minimal impact' },
          { label: '2', description: 'Low impact' },
          { label: '3', description: 'Moderate impact' },
          { label: '4', description: 'High impact' },
          { label: '5', description: 'Critical production outage' }
        ]
      }
    ]
  };

  schemaJsonText = JSON.stringify(this.schema, null, 2);
  jsonParseError = '';

  inputText = 'Urgent: our production database pipeline crashes with a fatal segmentation fault and customers cannot sign in!';
  samples = 1;
  useAbortSignal = true;

  availabilityStatus: string | null = null;
  availabilityTimeMs: number | null = null;
  sessionCreationTimeMs: number | null = null;
  executionTimeMs: number | null = null;

  session: any = null;
  isSimulatedSession = false;
  isCreating = false;
  isClassifying = false;
  isDownloading = false;
  downloadProgress = 0;

  result: NormalizedClassifierResult | null = null;
  rawOutputJson = '';
  errorMessage = '';
  shareText = 'Share';

  codeAvailability = '';
  codeSession = '';
  codeExecution = '';

  private availabilityTimer: any = null;
  private sessionTimer: any = null;
  private executionTimer: any = null;
  private activeAbortController: AbortController | null = null;
  private creationAbortController: AbortController | null = null;

  constructor(
    private classifierService: ClassifierService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.classifierService.isSupported()) {
      this.availabilityStatus = 'unavailable';
    }
    this.updateGeneratedCode();
  }

  ngOnDestroy() {
    this.destroySession();
    if (this.availabilityTimer) clearInterval(this.availabilityTimer);
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    if (this.executionTimer) clearInterval(this.executionTimer);
  }

  onSchemaJsonChange(val: string) {
    this.schemaJsonText = val;
    try {
      const parsed = JSON.parse(val);
      if (!parsed || !Array.isArray(parsed.questions)) {
        this.jsonParseError = 'Schema must contain a "questions" array.';
        return;
      }
      this.schema = parsed;
      this.jsonParseError = '';
      this.updateGeneratedCode();
    } catch (e: any) {
      this.jsonParseError = e.message || 'Invalid JSON syntax';
    }
  }

  syncJsonFromVisual() {
    this.schemaJsonText = JSON.stringify(this.schema, null, 2);
    this.jsonParseError = '';
    this.updateGeneratedCode();
  }

  addQuestion() {
    const idx = (this.schema.questions?.length || 0) + 1;
    this.schema.questions.push({
      id: `question_${idx}`,
      type: 'binary',
      prompt: 'Does this input satisfy the criterion?'
    });
    this.syncJsonFromVisual();
  }

  removeQuestion(index: number) {
    if (this.schema.questions.length > 1) {
      this.schema.questions.splice(index, 1);
      this.syncJsonFromVisual();
    }
  }

  onQuestionTypeChanged(q: ClassifierQuestion) {
    if (q.type === 'binary' || q.type === 'boolean') {
      delete q.options;
    } else if (q.type === 'ordinal' || q.type === 'score') {
      q.options = [
        { label: '1', description: 'Minimal' },
        { label: '2', description: 'Low' },
        { label: '3', description: 'Moderate' },
        { label: '4', description: 'High' },
        { label: '5', description: 'Critical' }
      ];
    } else if (!q.options || q.options.length === 0) {
      q.options = [
        { label: 'option_a', description: 'First choice' },
        { label: 'option_b', description: 'Second choice' }
      ];
    }
    this.syncJsonFromVisual();
  }

  addOption(q: ClassifierQuestion) {
    if (!q.options) q.options = [];
    q.options.push({
      label: `option_${q.options.length + 1}`,
      description: 'Option description'
    });
    this.syncJsonFromVisual();
  }

  removeOption(q: ClassifierQuestion, index: number) {
    if (q.options && q.options.length > 2) {
      q.options.splice(index, 1);
      this.syncJsonFromVisual();
    }
  }

  async checkAvailability() {
    this.availabilityTimeMs = 0;
    const startTime = performance.now();
    this.availabilityTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.availabilityTimeMs = Math.floor(performance.now() - startTime);
        this.cdr.detectChanges();
      });
    }, 10);

    try {
      this.availabilityStatus = 'checking';
      const nativeApi = this.classifierService.getNativeApi();
      if (!nativeApi) {
        this.availabilityStatus = 'unavailable';
      } else {
        this.availabilityStatus = await nativeApi.availability(this.schema);
      }
    } catch (e: any) {
      this.availabilityStatus = 'unavailable';
    } finally {
      clearInterval(this.availabilityTimer);
      this.availabilityTimeMs = Math.floor(performance.now() - startTime);
      this.cdr.detectChanges();
    }
  }

  async createSession() {
    this.isCreating = true;
    this.errorMessage = '';
    this.downloadProgress = 0;
    this.sessionCreationTimeMs = 0;
    const startTime = performance.now();

    this.sessionTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.sessionCreationTimeMs = Math.floor(performance.now() - startTime);
        this.cdr.detectChanges();
      });
    }, 10);

    if (this.useAbortSignal) {
      this.creationAbortController = new AbortController();
    }

    try {
      const nativeApi = this.classifierService.getNativeApi();
      if (!nativeApi) {
        this.availabilityStatus = 'unavailable';
        throw new Error('Classifier API is not supported in this browser.');
      }

      const avail = await nativeApi.availability(this.schema);
      this.availabilityStatus = avail;
      if (avail === 'unavailable') {
        throw new Error('Classifier model is unavailable for this configuration.');
      }

      const createOptions: any = {
        ...this.schema,
        monitor: (m: any) => {
          m.addEventListener('downloadprogress', (e: any) => {
            this.ngZone.run(() => {
              this.isDownloading = true;
              this.downloadProgress = Math.round(e.loaded * 100);
              this.cdr.detectChanges();
            });
          });
        }
      };
      if (this.creationAbortController) {
        createOptions.signal = this.creationAbortController.signal;
      }
      this.session = await nativeApi.create(createOptions);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create Classifier session';
    } finally {
      clearInterval(this.sessionTimer);
      this.sessionCreationTimeMs = Math.floor(performance.now() - startTime);
      this.isCreating = false;
      this.isDownloading = false;
      this.creationAbortController = null;
      this.cdr.detectChanges();
    }
  }

  abortCreation() {
    if (this.creationAbortController) {
      this.creationAbortController.abort('User aborted session creation');
    }
  }

  destroySession() {
    if (this.session) {
      if (typeof this.session.destroy === 'function') {
        this.session.destroy();
      }
      this.session = null;
      this.result = null;
      this.rawOutputJson = '';
    }
  }

  async runClassification() {
    if (!this.session) return;
    if (this.jsonParseError) {
      this.errorMessage = 'Fix schema JSON syntax error before running inference.';
      return;
    }

    this.isClassifying = true;
    this.errorMessage = '';
    this.executionTimeMs = 0;
    const start = performance.now();

    this.executionTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.executionTimeMs = Math.floor(performance.now() - start);
        this.cdr.detectChanges();
      });
    }, 10);

    if (this.useAbortSignal) {
      this.activeAbortController = new AbortController();
    }

    try {
      const t0 = performance.now();
      const raw = await this.session.classify(this.inputText, {
        samples: this.samples,
        signal: this.activeAbortController?.signal
      });
      const elapsed = Number((performance.now() - t0).toFixed(1));
      this.result = this.classifierService.normalizeResult(this.schema, raw, elapsed);
      this.rawOutputJson = JSON.stringify(this.result.raw, null, 2);
    } catch (e: any) {
      this.errorMessage = e.message || 'Error executing classification';
    } finally {
      clearInterval(this.executionTimer);
      this.executionTimeMs = this.result?.elapsedMs ?? Math.floor(performance.now() - start);
      this.isClassifying = false;
      this.activeAbortController = null;
      this.cdr.detectChanges();
    }
  }

  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted classification');
    }
  }

  sharePlayground() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.shareText = 'Copied!';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.shareText = 'Share';
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  updateGeneratedCode() {
    const schemaLiteral = JSON.stringify(this.schema, null, 2);
    const inputLiteral = JSON.stringify(this.inputText);

    this.codeAvailability = `const schema = ${schemaLiteral};

const availability = await Classifier.availability(schema);
console.log("Availability:", availability);`;

    this.codeSession = `const schema = ${schemaLiteral};

const classifier = await Classifier.create({
  ...schema,
  monitor(m) {
    m.addEventListener("downloadprogress", (e) => {
      console.log(\`Downloaded \${Math.round(e.loaded * 100)}%\`);
    });
  }
});`;

    this.codeExecution = `const input = ${inputLiteral};

const result = await classifier.classify(input, {
  samples: ${this.samples}
});

console.log(result);
classifier.destroy();`;
  }
}
