import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

declare const window: any;

@Component({
  selector: 'app-translator-playground',
  templateUrl: './translator.page.html',
  standalone: false
})
export class TranslatorPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;
  
  availabilityStatus: string | null = null;
  session: any = null;
  
  isCreating = false;
  isTranslating = false;
  isMeasuring = false;
  
  fullOutput = '';
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
      sourceLanguage: ['es', Validators.required],
      targetLanguage: ['en', Validators.required],
      
      // Execution Options
      promptInput: ['Hola mundo, ¿cómo estás?', Validators.required],
      
      useAbortSignal: [true]
    });
  }

  getTranslator() {
    return (window as any).ai?.translator || (window as any).Translator || (window as any).translation;
  }

  getCreateOptions() {
    const val = this.playgroundForm.value;
    const options: any = {};
    
    if (val.sourceLanguage) options.sourceLanguage = val.sourceLanguage;
    if (val.targetLanguage) options.targetLanguage = val.targetLanguage;

    return options;
  }

  async checkAvailability() {
    const ai = this.getTranslator();
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
    const ai = this.getTranslator();
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
      this.errorMessage = e.message || 'Failed to create translator session';
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
    
    this.isTranslating = true;
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

      if (isStreaming) {
        const stream = this.session.translateStreaming(val.promptInput, options);
        for await (const chunk of stream) {
          this.ngZone.run(() => {
            this.fullOutput += chunk;
            this.cdr.detectChanges();
          });
        }
      } else {
        const result = await this.session.translate(val.promptInput, options);
        this.fullOutput = result;
      }
      
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during translation';
    } finally {
      this.isTranslating = false;
      this.activeAbortController = null;
    }
  }
  
  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted translation');
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
    
    let code = `// Translator API Configuration\n\n`;
    code += `const options = {\n`;
    if (val.sourceLanguage) code += `  sourceLanguage: "${val.sourceLanguage}",\n`;
    if (val.targetLanguage) code += `  targetLanguage: "${val.targetLanguage}",\n`;
    code += `};\n\n`;
    
    code += `const availability = await translation.availability(options);\n\n`;
    
    if (val.useAbortSignal) code += `const controller = new AbortController();\noptions.signal = controller.signal;\n`;
    code += `options.monitor = (m) => m.addEventListener("downloadprogress", e => console.log(e.loaded));\n`;
    code += `const translator = await translation.create(options);\n\n`;
    
    code += `const translateOptions = {};\n`;
    if (val.useAbortSignal) code += `translateOptions.signal = new AbortController().signal;\n\n`;
    
    code += `// Streaming\n`;
    code += `const stream = translator.translateStreaming(${JSON.stringify(val.promptInput)}, translateOptions);\n`;
    code += `for await (const chunk of stream) {\n  console.log(chunk);\n}\n\n`;
    
    code += `// Non-Streaming\n`;
    code += `const result = await translator.translate(${JSON.stringify(val.promptInput)}, translateOptions);\n\n`;
    
    code += `const tokens = await translator.measureInputUsage(${JSON.stringify(val.promptInput)});\n`;
    code += `translator.destroy();\n`;

    this.generatedCode = code;
  }
}