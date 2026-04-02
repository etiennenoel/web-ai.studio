import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

declare const window: any;

@Component({
  selector: 'app-prompt-playground',
  templateUrl: './prompt.page.html',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' }
})
export class PromptPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;
  
  // State
  availabilityStatus: string | null = null;
  session: any = null;
  clonedSession: any = null;
  
  isCreating = false;
  isPrompting = false;
  isAppending = false;
  isCloning = false;
  isMeasuring = false;
  
  outputChunks: string[] = [];
  fullOutput = '';
  errorMessage = '';
  shareText = 'Share';
  constraintValidationResult: { valid: boolean, errors: string[] } | null = null;
  
  contextUsage = 0;
  contextWindow = 0;
  tokensMeasured = 0;
  
  downloadProgress = 0;
  isDownloading = false;
  
  codeAvailability = '';
  codeSession = '';
  codeExecution = '';
  
  private activeAbortController: AbortController | null = null;
  private creationAbortController: AbortController | null = null;

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
      this.validateConstraint();
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
    this.destroyClonedSession();
  }

  initForm() {
    this.playgroundForm = this.fb.group({
      // Create Options
      temperature: [null],
      topK: [null],
      
      initialPrompts: this.fb.array([
        this.createMessageGroup('system', 'You are a helpful assistant.')
      ]),
      
      expectedInputs: this.fb.array([]),
      expectedOutputs: this.fb.array([]),
      tools: this.fb.array([]),
      
      // Execution Options
      promptInput: ['Tell me a joke about a programmer.', Validators.required],
      responseConstraintType: ['regex'],
      responseConstraint: [null],
      omitResponseConstraintInput: [false],
      
      // Feature toggles
      useAbortSignal: [true]
    });
  }

  get initialPrompts() {
    return this.playgroundForm.get('initialPrompts') as FormArray;
  }

  get expectedInputs() {
    return this.playgroundForm.get('expectedInputs') as FormArray;
  }
  
  get expectedOutputs() {
    return this.playgroundForm.get('expectedOutputs') as FormArray;
  }

  get tools() {
    return this.playgroundForm.get('tools') as FormArray;
  }

  createMessageGroup(role: string = 'user', content: string = '') {
    return this.fb.group({
      role: [role],
      content: [content, Validators.required]
    });
  }

  addInitialPrompt() {
    this.initialPrompts.push(this.createMessageGroup());
  }

  removeInitialPrompt(index: number) {
    this.initialPrompts.removeAt(index);
  }

  addExpectedInput() {
    this.expectedInputs.push(this.fb.group({
      type: ['text', Validators.required],
      languages: ['en']
    }));
  }

  removeExpectedInput(index: number) {
    this.expectedInputs.removeAt(index);
  }
  
  addExpectedOutput() {
    this.expectedOutputs.push(this.fb.group({
      type: ['text', Validators.required],
      languages: ['en']
    }));
  }

  removeExpectedOutput(index: number) {
    this.expectedOutputs.removeAt(index);
  }

  addTool() {
    this.tools.push(this.fb.group({
      name: ['myTool', Validators.required],
      description: ['A sample tool', Validators.required],
      inputSchema: ['{"type":"object","properties":{}}']
    }));
  }

  removeTool(index: number) {
    this.tools.removeAt(index);
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
    
    if (val.initialPrompts.length > 0) {
      options.initialPrompts = val.initialPrompts.map((p: any) => ({
        role: p.role,
        content: p.content
      }));
    }

    if (val.expectedInputs.length > 0) {
      options.expectedInputs = val.expectedInputs.map((e: any) => ({
        type: e.type,
        languages: e.languages ? e.languages.split(',').map((l: string) => l.trim()) : undefined
      }));
    }
    
    if (val.expectedOutputs.length > 0) {
      options.expectedOutputs = val.expectedOutputs.map((e: any) => ({
        type: e.type,
        languages: e.languages ? e.languages.split(',').map((l: string) => l.trim()) : undefined
      }));
    }

    if (val.tools.length > 0) {
      options.tools = val.tools.map((t: any) => {
        let schema = {};
        try { schema = JSON.parse(t.inputSchema); } catch (e) {}
        return {
          name: t.name,
          description: t.description,
          inputSchema: schema,
          execute: async (args: any) => {
            console.log(`Tool ${t.name} executed with args:`, args);
            return JSON.stringify({ status: "success", executed: t.name });
          }
        };
      });
    }

    return options;
  }

  validateConstraint() {
    const val = this.playgroundForm.value.responseConstraint;
    const type = this.playgroundForm.value.responseConstraintType;
    if (!val) {
      this.constraintValidationResult = null;
      return;
    }
    const errors: string[] = [];
    let valid = true;
    
    if (type === 'regex') {
      try {
        const m = val.match(/\/(.*)\/(.*)?/);
        if (m) new RegExp(m[1], m[2] || '');
        else new RegExp(val);
      } catch (e: any) {
        valid = false;
        errors.push("Invalid Regular Expression: " + e.message);
      }
    } else if (type === 'json_schema') {
      let parsed: any;
      try {
        parsed = JSON.parse(val);
      } catch (e: any) {
        valid = false;
        errors.push("Invalid JSON: " + e.message);
      }
      
      if (parsed) {
        if (parsed['x-guidance']) {
          const validKeys = ['item_separator', 'key_separator', 'whitespace_flexible', 'whitespace_pattern', 'coerce_one_of', 'json_allowed_escapes', 'lenient'];
          for (const k in parsed['x-guidance']) {
            if (!validKeys.includes(k)) {
              errors.push(`Warning: Unrecognized 'x-guidance' key '${k}'.`);
            }
          }
        }
        
        const checkNode = (node: any) => {
          if (!node || typeof node !== 'object') return;
          
          if (node.oneOf) errors.push("Warning: 'oneOf' is only 68% supported (converted to anyOf when equivalent).");
          if (node.allOf) errors.push("Warning: 'allOf' is only 98% supported (intersection of certain schemas unsupported).");
          if (node.$ref && typeof node.$ref === 'string' && !node.$ref.startsWith('#')) {
            valid = false;
            errors.push("Error: External/remote '$ref' unsupported: " + node.$ref);
          }
          if (node.patternProperties) errors.push("Warning: 'patternProperties' (98% supported) must be disjoint.");
          if (node.minProperties !== undefined || node.maxProperties !== undefined) {
            errors.push("Warning: 'minProperties'/'maxProperties' (90% supported) only work when all defined 'properties' are 'required'.");
          }
          if (node.pattern && typeof node.pattern === 'string') {
            if (node.pattern.includes('(?=') || node.pattern.includes('(?!') || node.pattern.includes('(?<=') || node.pattern.includes('(?<!')) {
               valid = false;
               errors.push("Error: Lookarounds not supported in string 'pattern'.");
            }
          }
          if (node.format && typeof node.format === 'string') {
            const supportedFormats = ['date-time', 'time', 'date', 'duration', 'email', 'hostname', 'ipv4', 'ipv6', 'uuid', 'uri'];
            if (!supportedFormats.includes(node.format)) {
               valid = false;
               errors.push("Error: string format '" + node.format + "' not officially supported.");
            }
          }
          
          for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
              checkNode(node[key]);
            }
          }
        };
        
        checkNode(parsed);
      }
    }
    
    const uniqueErrors = Array.from(new Set(errors));
    this.constraintValidationResult = { valid, errors: uniqueErrors };
  }

  setConstraintType(type: string) {
    this.playgroundForm.get('responseConstraintType')?.setValue(type);
    if (type === 'json_schema' && !this.playgroundForm.get('responseConstraint')?.value) {
      this.playgroundForm.get('responseConstraint')?.setValue('{\n  "type": "object",\n  "properties": {}\n}');
    } else if (type === 'regex' && !this.playgroundForm.get('responseConstraint')?.value) {
      this.playgroundForm.get('responseConstraint')?.setValue('');
    }
  }

  onConstraintCodeChange(code: string) {
    this.ngZone.run(() => {
      this.playgroundForm.get('responseConstraint')?.setValue(code, { emitEvent: true });
    });
  }

  async checkAvailability() {
    const ai = this.getLanguageModel();
    if (!ai) {
      this.availabilityStatus = 'API not found. Is the flag enabled?';
      return;
    }
    try {
      this.availabilityStatus = 'Checking...';
      const options = this.getCreateOptions();
      const status = await ai.availability(options);
      this.availabilityStatus = status;
    } catch (e: any) {
      this.availabilityStatus = 'Error: ' + e.message;
    }
  }

  async createSession() {
    const ai = this.getLanguageModel();
    if (!ai) {
      this.errorMessage = 'LanguageModel API not available.';
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';
    this.downloadProgress = 0;
    this.isDownloading = false;

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
      
      // Add event listener for overflow
      if (this.session.addEventListener) {
        this.session.addEventListener('contextoverflow', () => {
          this.ngZone.run(() => {
             console.warn('Context Overflow event triggered!');
          });
        });
      }

      this.updateMetrics();
      this.isDownloading = false;
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create session';
      this.isDownloading = false;
    } finally {
      this.isCreating = false;
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
      if(typeof this.session.destroy === 'function') {
        this.session.destroy();
      }
      this.session = null;
    }
  }

  destroyClonedSession() {
    if (this.clonedSession) {
      if(typeof this.clonedSession.destroy === 'function') {
        this.clonedSession.destroy();
      }
      this.clonedSession = null;
    }
  }

  async runPrompt(isStreaming: boolean) {
    if (!this.session) return;
    
    this.isPrompting = true;
    this.errorMessage = '';
    this.fullOutput = '';
    this.outputChunks = [];
    
    if (this.playgroundForm.value.useAbortSignal) {
      this.activeAbortController = new AbortController();
    }

    try {
      const val = this.playgroundForm.value;
      let promptInput = val.promptInput;
      const options: any = {};
      
      if (this.uploadedImage || this.uploadedAudio) {
         const contentParts: any[] = [{ type: 'text', value: promptInput }];
         if (this.uploadedImage) contentParts.push({ type: 'image', value: this.uploadedImage });
         if (this.uploadedAudio) contentParts.push({ type: 'audio', value: this.uploadedAudio });
         promptInput = [{ role: 'user', content: contentParts }];
      }

      if (this.activeAbortController) {
        options.signal = this.activeAbortController.signal;
      }
      
      if (val.responseConstraint) {
        if (val.responseConstraintType === 'json_schema') {
          try {
            options.responseConstraint = JSON.parse(val.responseConstraint);
          } catch (e) {
             console.warn('Could not parse responseConstraint as JSON');
          }
        } else {
          try {
             const m = val.responseConstraint.match(/\/(.*)\/(.*)?/);
             if (m) options.responseConstraint = new RegExp(m[1], m[2] || '');
             else options.responseConstraint = new RegExp(val.responseConstraint);
          } catch (e) {
             console.warn('Could not parse responseConstraint as RegExp');
          }
        }
      }
      
      if (val.omitResponseConstraintInput) {
        options.omitResponseConstraintInput = true;
      }

      if (isStreaming) {
        const stream = this.session.promptStreaming(promptInput, options);
        for await (const chunk of stream) {
          this.ngZone.run(() => {
            this.outputChunks.push(chunk);
            this.fullOutput += chunk;
            this.cdr.detectChanges();
          });
        }
      } else {
        const result = await this.session.prompt(promptInput, options);
        this.fullOutput = result;
      }
      
      this.updateMetrics();
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

  async appendPrompt() {
    if (!this.session) return;
    
    this.isAppending = true;
    this.errorMessage = '';
    
    const val = this.playgroundForm.value;
    let promptInput = val.promptInput;
    
    if (this.uploadedImage || this.uploadedAudio) {
       const contentParts: any[] = [{ type: 'text', value: promptInput }];
       if (this.uploadedImage) contentParts.push({ type: 'image', value: this.uploadedImage });
       if (this.uploadedAudio) contentParts.push({ type: 'audio', value: this.uploadedAudio });
       promptInput = [{ role: 'user', content: contentParts }];
    }
    
    try {
      await this.session.append(promptInput);
      this.fullOutput = '(Appended successfully without response)';
      this.updateMetrics();
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during append';
    } finally {
      this.isAppending = false;
    }
  }

  async measureUsage() {
    if (!this.session) return;
    
    this.isMeasuring = true;
    this.errorMessage = '';
    this.tokensMeasured = 0;
    
    const val = this.playgroundForm.value;
    let promptInput = val.promptInput;

    if (this.uploadedImage || this.uploadedAudio) {
       const contentParts: any[] = [{ type: 'text', value: promptInput }];
       if (this.uploadedImage) contentParts.push({ type: 'image', value: this.uploadedImage });
       if (this.uploadedAudio) contentParts.push({ type: 'audio', value: this.uploadedAudio });
       promptInput = [{ role: 'user', content: contentParts }];
    }
    
    try {
      this.tokensMeasured = await this.session.measureContextUsage(promptInput);
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during measureUsage';
    } finally {
      this.isMeasuring = false;
    }
  }

  async cloneSession() {
    if (!this.session) return;
    
    this.isCloning = true;
    this.errorMessage = '';
    
    try {
      this.destroyClonedSession(); // cleanup previous
      this.clonedSession = await this.session.clone();
      this.fullOutput = '(Session cloned successfully. clonedSession is now available.)';
    } catch (e: any) {
      this.errorMessage = e.message || 'Error during clone';
    } finally {
      this.isCloning = false;
    }
  }

  updateMetrics() {
    if (this.session) {
      this.contextUsage = this.session.contextUsage || this.session.inputUsage || 0;
      this.contextWindow = this.session.contextWindow || this.session.inputQuota || 0;
    }
  }
  sharePlayground() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.shareText = 'Copied!';
      if (this.cdr) this.cdr.detectChanges();
      setTimeout(() => {
        this.shareText = 'Share';
        if (this.cdr) this.cdr.detectChanges();
      }, 2000);
    });
  }


  updateGeneratedCode() {
    const val = this.playgroundForm.value;
    
    let code = `// Prompt API Playground Configuration\n\n`;
    
    code += `// 1. Check availability (Optional)\n`;
    code += `const options = {\n`;
    
    if (val.temperature !== null) code += `  temperature: ${val.temperature},\n`;
    if (val.topK !== null) code += `  topK: ${val.topK},\n`;
    
    if (val.initialPrompts.length > 0) {
      code += `  initialPrompts: [\n`;
      val.initialPrompts.forEach((p: any) => {
        code += `    { role: "${p.role}", content: ${JSON.stringify(p.content)} },\n`;
      });
      code += `  ],\n`;
    }
    
    if (val.expectedInputs.length > 0) {
      code += `  expectedInputs: [\n`;
      val.expectedInputs.forEach((e: any) => {
        code += `    { type: "${e.type}"${e.languages ? `, languages: [${e.languages.split(',').map((l:any) => `"${l.trim()}"`).join(', ')}]` : ''} },\n`;
      });
      code += `  ],\n`;
    }
    
    if (val.expectedOutputs.length > 0) {
      code += `  expectedOutputs: [\n`;
      val.expectedOutputs.forEach((e: any) => {
        code += `    { type: "${e.type}"${e.languages ? `, languages: [${e.languages.split(',').map((l:any) => `"${l.trim()}"`).join(', ')}]` : ''} },\n`;
      });
      code += `  ],\n`;
    }
    
    if (val.tools.length > 0) {
      code += `  tools: [\n`;
      val.tools.forEach((t: any) => {
        code += `    {\n      name: "${t.name}",\n      description: "${t.description}",\n`;
        code += `      inputSchema: ${t.inputSchema || '{}'},\n`;
        code += `      execute: async (args) => JSON.stringify({ status: "success" })\n    },\n`;
      });
      code += `  ]\n`;
    }
    
    code += `};\n\n`;
    
    code += `const availability = await LanguageModel.availability(options);\n\n`;
    
    code += `// 2. Create Session\n`;
    if (val.useAbortSignal) code += `const controller = new AbortController();\noptions.signal = controller.signal;\n`;
    code += `options.monitor = (m) => m.addEventListener("downloadprogress", e => console.log(e.loaded));\n`;
    code += `const session = await LanguageModel.create(options);\n\n`;
    
    code += `// 3. Execution\n`;
    code += `const promptOptions = {};\n`;
    if (val.responseConstraint) {
      if (val.responseConstraintType === 'json_schema') {
        let parsed = val.responseConstraint;
        try { parsed = JSON.stringify(JSON.parse(val.responseConstraint)); } catch(e) {}
        code += `promptOptions.responseConstraint = ${parsed};\n`;
      } else {
        code += `promptOptions.responseConstraint = /${val.responseConstraint}/;\n`;
      }
    }
    if (val.omitResponseConstraintInput) code += `promptOptions.omitResponseConstraintInput = true;\n`;
    if (val.useAbortSignal) code += `promptOptions.signal = new AbortController().signal;\n`;
    
    code += `\n// Input\n`;
    code += `let promptInput = ${JSON.stringify(val.promptInput)};\n`;
    if (this.uploadedImage || this.uploadedAudio) {
      code += `const contentParts = [{ type: 'text', value: promptInput }];\n`;
      code += `// Assume imageBlob and audioBlob are obtained via input files\n`;
      if (this.uploadedImage) code += `if (imageBlob) contentParts.push({ type: 'image', value: imageBlob });\n`;
      if (this.uploadedAudio) code += `if (audioBlob) contentParts.push({ type: 'audio', value: audioBlob });\n`;
      code += `promptInput = [{ role: 'user', content: contentParts }];\n`;
    }
    
    code += `\n// Streaming\n`;
    code += `const stream = session.promptStreaming(promptInput, promptOptions);\n`;
    code += `for await (const chunk of stream) {\n  console.log(chunk);\n}\n\n`;
    
    code += `// Non-Streaming\n`;
    code += `const result = await session.prompt(promptInput, promptOptions);\n\n`;
    
    code += `// Other Methods\n`;
    code += `await session.append(promptInput);\n`;
    code += `const tokens = await session.measureContextUsage(promptInput);\n`;
    code += `const clonedSession = await session.clone();\n`;
    code += `session.destroy();\n`;

    
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
