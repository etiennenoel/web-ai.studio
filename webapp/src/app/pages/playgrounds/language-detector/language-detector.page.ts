import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

declare const window: any;

@Component({
  selector: 'app-language-detector-playground',
  templateUrl: './language-detector.page.html',
  standalone: false
})
export class LanguageDetectorPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;
  
  availabilityStatus: string | null = null;
  session: any = null;
  
  isCreating = false;
  isDetecting = false;
  isMeasuring = false;
  
  detections: { detectedLanguage: string; confidence: number }[] = [];
  errorMessage = '';
  
  tokensMeasured = 0;
  
  downloadProgress = 0;
  isDownloading = false;
  
  generatedCode = '';
  
  private activeAbortController: AbortController | null = null;
  private creationAbortController: AbortController | null = null;

  constructor(private fb: FormBuilder, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initForm();
    this.updateGeneratedCode();
    
    this.playgroundForm.valueChanges.subscribe(() => {
      this.updateGeneratedCode();
    });
  }

  ngOnDestroy() {
    this.destroySession();
  }

  initForm() {
    this.playgroundForm = this.fb.group({
      // Create Options
      expectedInputLanguages: this.fb.array([]),
      
      // Execution Options
      promptInput: ['Bonjour le monde, c\'est un texte de test.', Validators.required],
      
      useAbortSignal: [true]
    });
  }

  get expectedInputLanguages() {
    return this.playgroundForm.get('expectedInputLanguages') as FormArray;
  }

  addExpectedInputLanguage() {
    this.expectedInputLanguages.push(this.fb.control('en'));
  }

  removeExpectedInputLanguage(index: number) {
    this.expectedInputLanguages.removeAt(index);
  }

  getLanguageDetector() {
    return (window as any).ai?.languageDetector || (window as any).translation?.languageDetector || (window as any).LanguageDetector;
  }

  getCreateOptions() {
    const val = this.playgroundForm.value;
    const options: any = {};

    if (val.expectedInputLanguages.length > 0) {
      options.expectedInputLanguages = val.expectedInputLanguages;
    }

    return options;
  }

  async checkAvailability() {
    const ai = this.getLanguageDetector();
    if (!ai) {
      this.availabilityStatus = 'API not found.';
      return;
    }
    try {
      this.availabilityStatus = 'Checking...';
      const status = await ai.availability(this.getCreateOptions());
      this.availabilityStatus = status;
    } catch (e: any) {
      this.availabilityStatus = 'Error: ' + e.message;
    }
  }

  async createSession() {
    const ai = this.getLanguageDetector();
    if (!ai) return;

    this.isCreating = true;
    this.errorMessage = '';
    this.downloadProgress = 0;

    if (this.playgroundForm.value.useAbortSignal) {
      this.creationAbortController = new AbortController();
    }

    try {
      const options = this.getCreateOptions();
      
      options.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          this.ngZone.run(() => {
            this.isDownloading = true;
            this.downloadProgress = Math.round(e.loaded * 100);
            this.cdr.detectChanges();
          });
        });
      };

      if (this.creationAbortController) {
        options.signal = this.creationAbortController.signal;
      }

      this.session = await ai.create(options);
      
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create detector session';
    } finally {
      this.isCreating = false;
      this.isDownloading = false;
      this.creationAbortController = null;
    }
  }
  
  abortCreation() {
    if (this.creationAbortController) {
      this.creationAbortController.abort('User aborted creation');
    }
  }

  destroySession() {
    if (this.session) {
      if(typeof this.session.destroy === 'function') this.session.destroy();
      this.session = null;
    }
  }

  async runPrompt() {
    if (!this.session) return;
    
    this.isDetecting = true;
    this.errorMessage = '';
    this.detections = [];
    
    if (this.playgroundForm.value.useAbortSignal) {
      this.activeAbortController = new AbortController();
    }

    try {
      const val = this.playgroundForm.value;
      const options: any = {};
      
      if (this.activeAbortController) {
        options.signal = this.activeAbortController.signal;
      }

      const result = await this.session.detect(val.promptInput, options);
      this.detections = result || [];
      
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during detection';
    } finally {
      this.isDetecting = false;
      this.activeAbortController = null;
    }
  }
  
  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted detection');
    }
  }

  async measureUsage() {
    if (!this.session) return;
    
    this.isMeasuring = true;
    this.errorMessage = '';
    this.tokensMeasured = 0;
    
    const val = this.playgroundForm.value;
    
    try {
      if (typeof this.session.measureInputUsage === 'function') {
        this.tokensMeasured = await this.session.measureInputUsage(val.promptInput);
      } else {
        this.errorMessage = 'measureInputUsage not supported by this API version';
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during measureUsage';
    } finally {
      this.isMeasuring = false;
    }
  }

  updateGeneratedCode() {
    const val = this.playgroundForm.value;
    
    let code = `// Language Detector API Configuration\n\n`;
    code += `const options = {\n`;
    if (val.expectedInputLanguages.length > 0) {
      code += `  expectedInputLanguages: ${JSON.stringify(val.expectedInputLanguages)},\n`;
    }
    code += `};\n\n`;
    
    code += `const availability = await LanguageDetector.availability(options);\n\n`;
    
    if (val.useAbortSignal) code += `const controller = new AbortController();\noptions.signal = controller.signal;\n`;
    code += `options.monitor = (m) => m.addEventListener("downloadprogress", e => console.log(e.loaded));\n`;
    code += `const detector = await LanguageDetector.create(options);\n\n`;
    
    code += `const detectOptions = {};\n`;
    if (val.useAbortSignal) code += `detectOptions.signal = new AbortController().signal;\n\n`;
    
    code += `const results = await detector.detect(${JSON.stringify(val.promptInput)}, detectOptions);\n`;
    code += `for (const result of results) {\n`;
    code += `  console.log(result.detectedLanguage, result.confidence);\n`;
    code += `}\n\n`;
    
    code += `const tokens = await detector.measureInputUsage(${JSON.stringify(val.promptInput)});\n`;
    code += `detector.destroy();\n`;

    this.generatedCode = code;
  }
}