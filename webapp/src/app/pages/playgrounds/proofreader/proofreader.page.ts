import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

declare const window: any;

@Component({
  selector: 'app-proofreader-playground',
  templateUrl: './proofreader.page.html',
  standalone: false
})
export class ProofreaderPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;
  
  availabilityStatus: string | null = null;
  session: any = null;
  
  isCreating = false;
  isProofreading = false;
  
  result: { correctedInput: string; corrections: any[] } | null = null;
  errorMessage = '';
  
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
      includeCorrectionTypes: [true],
      includeCorrectionExplanations: [true],
      correctionExplanationLanguage: ['en'],
      expectedInputLanguages: this.fb.array([]),
      
      // Execution Options
      promptInput: ['I seen him yesterday at the store, and he bought two loafs of bread.', Validators.required],
      
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

  getProofreader() {
    return (window as any).ai?.proofreader || (window as any).Proofreader;
  }

  getCreateOptions() {
    const val = this.playgroundForm.value;
    const options: any = {};
    
    if (val.includeCorrectionTypes !== null) options.includeCorrectionTypes = val.includeCorrectionTypes;
    if (val.includeCorrectionExplanations !== null) options.includeCorrectionExplanations = val.includeCorrectionExplanations;
    if (val.correctionExplanationLanguage) options.correctionExplanationLanguage = val.correctionExplanationLanguage;

    if (val.expectedInputLanguages.length > 0) {
      options.expectedInputLanguages = val.expectedInputLanguages;
    }

    return options;
  }

  async checkAvailability() {
    const ai = this.getProofreader();
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
    const ai = this.getProofreader();
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
      this.errorMessage = e.message || 'Failed to create proofreader session';
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
    
    this.isProofreading = true;
    this.errorMessage = '';
    this.result = null;
    
    if (this.playgroundForm.value.useAbortSignal) {
      this.activeAbortController = new AbortController();
    }

    try {
      const val = this.playgroundForm.value;
      const options: any = {};
      
      if (this.activeAbortController) {
        options.signal = this.activeAbortController.signal;
      }

      const res = await this.session.proofread(val.promptInput, options);
      this.result = res;
      
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during proofreading';
    } finally {
      this.isProofreading = false;
      this.activeAbortController = null;
    }
  }
  
  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted proofreading');
    }
  }

  updateGeneratedCode() {
    const val = this.playgroundForm.value;
    
    let code = `// Proofreader API Configuration\n\n`;
    code += `const options = {\n`;
    code += `  includeCorrectionTypes: ${val.includeCorrectionTypes},\n`;
    code += `  includeCorrectionExplanations: ${val.includeCorrectionExplanations},\n`;
    if (val.correctionExplanationLanguage) code += `  correctionExplanationLanguage: "${val.correctionExplanationLanguage}",\n`;
    
    if (val.expectedInputLanguages.length > 0) {
      code += `  expectedInputLanguages: ${JSON.stringify(val.expectedInputLanguages)},\n`;
    }
    code += `};\n\n`;
    
    code += `const availability = await Proofreader.availability(options);\n\n`;
    
    if (val.useAbortSignal) code += `const controller = new AbortController();\noptions.signal = controller.signal;\n`;
    code += `options.monitor = (m) => m.addEventListener("downloadprogress", e => console.log(e.loaded));\n`;
    code += `const proofreader = await Proofreader.create(options);\n\n`;
    
    code += `const proofreadOptions = {};\n`;
    if (val.useAbortSignal) code += `proofreadOptions.signal = new AbortController().signal;\n\n`;
    
    code += `const result = await proofreader.proofread(${JSON.stringify(val.promptInput)}, proofreadOptions);\n`;
    code += `console.log(result.correctedInput, result.corrections);\n\n`;
    
    code += `proofreader.destroy();\n`;

    this.generatedCode = code;
  }
}