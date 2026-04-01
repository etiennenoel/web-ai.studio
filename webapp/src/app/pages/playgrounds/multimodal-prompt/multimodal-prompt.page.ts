import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

declare const window: any;

@Component({
  selector: 'app-multimodal-prompt-playground',
  templateUrl: './multimodal-prompt.page.html',
  standalone: false
})
export class MultimodalPromptPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;
  
  availabilityStatus: string | null = null;
  session: any = null;
  
  isCreating = false;
  isPrompting = false;
  
  fullOutput = '';
  errorMessage = '';
  
  downloadProgress = 0;
  isDownloading = false;
  
  generatedCode = '';
  
  private activeAbortController: AbortController | null = null;
  
  uploadedImage: File | null = null;
  uploadedAudio: File | null = null;

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
      temperature: [null],
      topK: [null],
      
      expectedInputs: this.fb.array([
        this.fb.group({ type: ['image', Validators.required] })
      ]),
      
      promptInput: ['Describe this image.', Validators.required]
    });
  }

  get expectedInputs() {
    return this.playgroundForm.get('expectedInputs') as FormArray;
  }

  addExpectedInput() {
    this.expectedInputs.push(this.fb.group({ type: ['image', Validators.required] }));
  }

  removeExpectedInput(index: number) {
    this.expectedInputs.removeAt(index);
  }

  onImageSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.uploadedImage = event.target.files[0];
    }
  }

  onAudioSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.uploadedAudio = event.target.files[0];
    }
  }

  getLanguageModel() {
    return (window as any).ai?.languageModel || (window as any).LanguageModel;
  }

  getCreateOptions() {
    const val = this.playgroundForm.value;
    const options: any = {};
    
    if (val.temperature !== null) options.temperature = parseFloat(val.temperature);
    if (val.topK !== null) options.topK = parseInt(val.topK, 10);
    
    if (val.expectedInputs.length > 0) {
      options.expectedInputs = val.expectedInputs.map((e: any) => ({
        type: e.type
      }));
    }

    return options;
  }

  async checkAvailability() {
    const ai = this.getLanguageModel();
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
    const ai = this.getLanguageModel();
    if (!ai) return;

    this.isCreating = true;
    this.errorMessage = '';
    this.downloadProgress = 0;

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

      this.session = await ai.create(options);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create session';
    } finally {
      this.isCreating = false;
      this.isDownloading = false;
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
    
    this.isPrompting = true;
    this.errorMessage = '';
    this.fullOutput = '';
    
    this.activeAbortController = new AbortController();

    try {
      const val = this.playgroundForm.value;
      const options: any = { signal: this.activeAbortController.signal };
      
      const contentParts: any[] = [{ type: 'text', value: val.promptInput }];
      if (this.uploadedImage) contentParts.push({ type: 'image', value: this.uploadedImage });
      if (this.uploadedAudio) contentParts.push({ type: 'audio', value: this.uploadedAudio });

      const input = [{ role: 'user', content: contentParts }];
      
      const stream = this.session.promptStreaming(input, options);
      for await (const chunk of stream) {
        this.ngZone.run(() => {
          this.fullOutput += chunk;
          this.cdr.detectChanges();
        });
      }
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during prompt';
    } finally {
      this.isPrompting = false;
      this.activeAbortController = null;
    }
  }
  
  abortPrompt() {
    if (this.activeAbortController) {
      this.activeAbortController.abort('User aborted prompt');
    }
  }

  updateGeneratedCode() {
    const val = this.playgroundForm.value;
    
    let code = `// Multimodal Prompt API Configuration\n\n`;
    code += `const options = {\n`;
    if (val.temperature !== null) code += `  temperature: ${val.temperature},\n`;
    if (val.topK !== null) code += `  topK: ${val.topK},\n`;
    
    if (val.expectedInputs.length > 0) {
      code += `  expectedInputs: [\n`;
      val.expectedInputs.forEach((e: any) => {
        code += `    { type: "${e.type}" },\n`;
      });
      code += `  ]\n`;
    }
    code += `};\n\n`;
    
    code += `const session = await LanguageModel.create(options);\n\n`;
    
    code += `const contentParts = [{ type: 'text', value: ${JSON.stringify(val.promptInput)} }];\n`;
    code += `// Assume imageBlob and audioBlob are obtained via input files\n`;
    code += `if (imageBlob) contentParts.push({ type: 'image', value: imageBlob });\n`;
    code += `if (audioBlob) contentParts.push({ type: 'audio', value: audioBlob });\n\n`;
    
    code += `const input = [{ role: 'user', content: contentParts }];\n\n`;
    
    code += `const stream = session.promptStreaming(input);\n`;
    code += `for await (const chunk of stream) {\n  console.log(chunk);\n}\n`;

    this.generatedCode = code;
  }
}