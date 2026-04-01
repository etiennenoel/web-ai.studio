import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

declare const window: any;

@Component({
  selector: 'app-rewriter-playground',
  templateUrl: './rewriter.page.html',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' }
})
export class RewriterPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;
  
  availabilityStatus: string | null = null;
  session: any = null;
  
  isCreating = false;
  isRewriting = false;
  isMeasuring = false;
  
  fullOutput = '';
  errorMessage = '';
  
  inputQuota = 0;
  tokensMeasured = 0;
  
  downloadProgress = 0;
  isDownloading = false;
  
  generatedCode = '';
  
  private activeAbortController: AbortController | null = null;
  private creationAbortController: AbortController | null = null;

  constructor(
    private fb: FormBuilder, 
    private ngZone: NgZone, 
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initForm();

    const queryParams = this.route.snapshot.queryParams;
    if (Object.keys(queryParams).length > 0) {
      this.patchFormFromUrl(queryParams);
    }

    this.updateGeneratedCode();
    
    this.playgroundForm.valueChanges.subscribe(val => {
      this.updateGeneratedCode();
      this.updateUrl(val);
    });
  }

  updateUrl(val: any) {
    const queryParamsToSave: any = {};
    for (const key of Object.keys(val)) {
      const value = val[key];
      if (Array.isArray(value)) {
        if (value.length > 0) queryParamsToSave[key] = JSON.stringify(value);
      } else if (typeof value === 'object' && value !== null) {
        if (Object.keys(value).length > 0) queryParamsToSave[key] = JSON.stringify(value);
      } else if (value !== null && value !== '') {
        queryParamsToSave[key] = value;
      }
    }
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParamsToSave,
      replaceUrl: true
    });
  }

  patchFormFromUrl(queryParams: any) {
    const patchValue: any = {};
    for (const key of Object.keys(queryParams)) {
      const value = queryParams[key];
      const control = this.playgroundForm.get(key);
      if (control instanceof FormArray) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            control.clear();
            parsed.forEach((item: any) => {
              if (key === 'initialPrompts') {
                control.push(this.fb.group({ role: item.role || 'user', content: item.content || '' }));
              } else if (key === 'expectedInputs' || key === 'expectedOutputs') {
                control.push(this.fb.group({ type: item.type || 'text', languages: item.languages || '' }));
              } else if (key === 'tools') {
                control.push(this.fb.group({ name: item.name || '', description: item.description || '', inputSchema: item.inputSchema || '' }));
              } else {
                control.push(this.fb.control(item));
              }
            });
          }
        } catch (e) {}
      } else {
        if (value === 'true') patchValue[key] = true;
        else if (value === 'false') patchValue[key] = false;
        else patchValue[key] = value;
      }
    }
    this.playgroundForm.patchValue(patchValue);
  }

  ngOnDestroy() {
    this.destroySession();
  }

  initForm() {
    this.playgroundForm = this.fb.group({
      // Create Options
      tone: ['as-is'],
      format: ['as-is'],
      length: ['as-is'],
      sharedContext: [''],
      outputLanguage: [''],
      
      expectedInputLanguages: this.fb.array([]),
      expectedContextLanguages: this.fb.array([]),
      
      // Execution Options
      promptInput: ['this app is pretty good but crashes sometimes', Validators.required],
      context: [''],
      
      useAbortSignal: [true]
    });
  }

  get expectedInputLanguages() {
    return this.playgroundForm.get('expectedInputLanguages') as FormArray;
  }
  
  get expectedContextLanguages() {
    return this.playgroundForm.get('expectedContextLanguages') as FormArray;
  }

  addExpectedInputLanguage() {
    this.expectedInputLanguages.push(this.fb.control('en'));
  }

  removeExpectedInputLanguage(index: number) {
    this.expectedInputLanguages.removeAt(index);
  }
  
  addExpectedContextLanguage() {
    this.expectedContextLanguages.push(this.fb.control('en'));
  }

  removeExpectedContextLanguage(index: number) {
    this.expectedContextLanguages.removeAt(index);
  }

  getRewriter() {
    return (window as any).ai?.rewriter || (window as any).Rewriter;
  }

  getCreateOptions() {
    const val = this.playgroundForm.value;
    const options: any = {};
    
    if (val.tone && val.tone !== 'as-is') options.tone = val.tone;
    if (val.format && val.format !== 'as-is') options.format = val.format;
    if (val.length && val.length !== 'as-is') options.length = val.length;
    if (val.sharedContext) options.sharedContext = val.sharedContext;
    if (val.outputLanguage) options.outputLanguage = val.outputLanguage;

    if (val.expectedInputLanguages.length > 0) {
      options.expectedInputLanguages = val.expectedInputLanguages;
    }
    
    if (val.expectedContextLanguages.length > 0) {
      options.expectedContextLanguages = val.expectedContextLanguages;
    }

    return options;
  }

  async checkAvailability() {
    const ai = this.getRewriter();
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
    const ai = this.getRewriter();
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
      
      this.inputQuota = this.session.inputQuota || 0;
      
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create session';
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

  async runPrompt(isStreaming: boolean) {
    if (!this.session) return;
    
    this.isRewriting = true;
    this.errorMessage = '';
    this.fullOutput = '';
    
    if (this.playgroundForm.value.useAbortSignal) {
      this.activeAbortController = new AbortController();
    }

    try {
      const val = this.playgroundForm.value;
      const options: any = {};
      
      if (this.activeAbortController) {
        options.signal = this.activeAbortController.signal;
      }
      
      if (val.context) {
        options.context = val.context;
      }

      if (isStreaming) {
        const stream = this.session.rewriteStreaming(val.promptInput, options);
        for await (const chunk of stream) {
          this.ngZone.run(() => {
            this.fullOutput += chunk;
            this.cdr.detectChanges();
          });
        }
      } else {
        const result = await this.session.rewrite(val.promptInput, options);
        this.fullOutput = result;
      }
      
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during rewriting';
    } finally {
      this.isRewriting = false;
      this.activeAbortController = null;
    }
  }
  
  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted prompt');
    }
  }

  async measureUsage() {
    if (!this.session) return;
    
    this.isMeasuring = true;
    this.errorMessage = '';
    this.tokensMeasured = 0;
    
    const val = this.playgroundForm.value;
    
    try {
      const options: any = {};
      if (val.context) options.context = val.context;
      this.tokensMeasured = await this.session.measureInputUsage(val.promptInput, options);
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during measureUsage';
    } finally {
      this.isMeasuring = false;
    }
  }

  updateGeneratedCode() {
    const val = this.playgroundForm.value;
    
    let code = `// Rewriter API Configuration\n\n`;
    code += `const options = {\n`;
    if (val.tone && val.tone !== 'as-is') code += `  tone: "${val.tone}",\n`;
    if (val.format && val.format !== 'as-is') code += `  format: "${val.format}",\n`;
    if (val.length && val.length !== 'as-is') code += `  length: "${val.length}",\n`;
    if (val.sharedContext) code += `  sharedContext: ${JSON.stringify(val.sharedContext)},\n`;
    if (val.outputLanguage) code += `  outputLanguage: "${val.outputLanguage}",\n`;
    
    if (val.expectedInputLanguages.length > 0) {
      code += `  expectedInputLanguages: ${JSON.stringify(val.expectedInputLanguages)},\n`;
    }
    
    if (val.expectedContextLanguages.length > 0) {
      code += `  expectedContextLanguages: ${JSON.stringify(val.expectedContextLanguages)},\n`;
    }
    
    code += `};\n\n`;
    
    code += `const availability = await Rewriter.availability(options);\n\n`;
    
    if (val.useAbortSignal) code += `const controller = new AbortController();\noptions.signal = controller.signal;\n`;
    code += `options.monitor = (m) => m.addEventListener("downloadprogress", e => console.log(e.loaded));\n`;
    code += `const session = await Rewriter.create(options);\n\n`;
    
    code += `const rewriteOptions = {};\n`;
    if (val.context) code += `rewriteOptions.context = ${JSON.stringify(val.context)};\n`;
    if (val.useAbortSignal) code += `rewriteOptions.signal = new AbortController().signal;\n\n`;
    
    code += `// Streaming\n`;
    code += `const stream = session.rewriteStreaming(${JSON.stringify(val.promptInput)}, rewriteOptions);\n`;
    code += `for await (const chunk of stream) {\n  console.log(chunk);\n}\n\n`;
    
    code += `// Non-Streaming\n`;
    code += `const result = await session.rewrite(${JSON.stringify(val.promptInput)}, rewriteOptions);\n\n`;
    
    code += `const tokens = await session.measureInputUsage(${JSON.stringify(val.promptInput)}, rewriteOptions);\n`;
    code += `session.destroy();\n`;

    this.generatedCode = code;
  }
}