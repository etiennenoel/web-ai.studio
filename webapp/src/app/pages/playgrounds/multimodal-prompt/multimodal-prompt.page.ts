import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

declare const window: any;

@Component({
  selector: 'app-multimodal-prompt-playground',
  templateUrl: './multimodal-prompt.page.html',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' }
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
  
  codeAvailability = '';
  codeSession = '';
  codeExecution = '';
  
  private activeAbortController: AbortController | null = null;
  
  uploadedImage: File | null = null;
  uploadedAudio: File | null = null;

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

    
    // Split the monolithic generated code into step-specific variables
    let tempCode = code;

    const availabilityMatch = tempCode.match(/([\s\S]*?await [A-Za-z]+\.availability[\s\S]*?\n\n)/);
    if (availabilityMatch) {
      this.codeAvailability = availabilityMatch[1].trim();
      tempCode = tempCode.substring(availabilityMatch[1].length);
    } else {
      this.codeAvailability = '// Availability check code not found';
    }

    const createMatch = tempCode.match(/([\s\S]*?await [A-Za-z]+\.create[\s\S]*?\n\n)/);
    if (createMatch) {
      this.codeSession = createMatch[1].trim();
      this.codeExecution = tempCode.substring(createMatch[1].length).trim();
    } else {
      this.codeSession = '// Session creation code not found';
      this.codeExecution = tempCode.trim();
    }

  }
}