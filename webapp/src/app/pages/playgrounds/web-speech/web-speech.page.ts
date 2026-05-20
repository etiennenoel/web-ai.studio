import { Component, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

declare const window: any;

interface LogEntry {
  time: string;
  event: string;
  detail: string;
}

@Component({
  selector: 'app-web-speech-playground',
  templateUrl: './web-speech.page.html',
  standalone: false,
  host: { class: 'block w-full h-full overflow-y-auto bg-[#ffffff] dark:bg-[#121212]' }
})
export class WebSpeechPlaygroundPage implements OnInit, OnDestroy {
  playgroundForm!: FormGroup;

  activeTab: 'recognition' | 'synthesis' = 'recognition';

  shareText = 'Share';

  // --- Recognition state ---
  availabilityStatus: string | null = null;
  availabilityTimeMs: number | null = null;
  private availabilityTimer: any = null;

  isInstalling = false;
  installResult: string | null = null;
  isDownloading = false;
  downloadProgress = 0;

  recognition: any = null;
  isListening = false;
  finalTranscript = '';
  interimTranscript = '';
  alternatives: { transcript: string; confidence: number }[] = [];
  recognitionLog: LogEntry[] = [];
  recognitionError = '';

  // --- Synthesis state ---
  voices: any[] = [];
  isSpeaking = false;
  isPaused = false;
  synthesisLog: LogEntry[] = [];
  synthesisError = '';
  private currentUtterance: any = null;

  // --- Generated code ---
  codeRecognition = '';
  codeSynthesis = '';

  readonly qualityLevels = [
    { value: 'command', label: 'Command', hint: 'Short phrases, single speaker, limited vocabulary.' },
    { value: 'dictation', label: 'Dictation', hint: 'Continuous speech, moderate noise, one speaker.' },
    { value: 'conversation', label: 'Conversation', hint: 'Multi-speaker, complex vocabulary, high noise.' },
  ];

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
    if (queryParams['tab'] === 'synthesis') this.activeTab = 'synthesis';
    if (Object.keys(queryParams).length > 0) {
      this.patchFormFromUrl(queryParams);
    }

    this.loadVoices();
    this.updateGeneratedCode();

    this.playgroundForm.valueChanges.subscribe(val => {
      this.updateGeneratedCode();
      this.updateUrl(val);
    });
  }

  ngOnDestroy() {
    this.stopRecognition();
    this.cancelSpeech();
    if (this.availabilityTimer) clearInterval(this.availabilityTimer);
  }

  initForm() {
    this.playgroundForm = this.fb.group({
      // Recognition options
      lang: ['en-US', Validators.required],
      continuous: [true],
      interimResults: [true],
      maxAlternatives: [1],
      processLocally: [true],
      quality: ['dictation'],
      phrases: this.fb.array([]),

      // Synthesis options
      synthesisText: ['Hello! This is the Web Speech API text-to-speech playground.', Validators.required],
      voiceURI: [''],
      synthesisLang: ['en-US'],
      rate: [1],
      pitch: [1],
      volume: [1],
    });
  }

  get phrases(): FormArray {
    return this.playgroundForm.get('phrases') as FormArray;
  }

  createPhraseGroup(phrase = '', boost = 2.0) {
    return this.fb.group({
      phrase: [phrase, Validators.required],
      boost: [boost],
    });
  }

  addPhrase() {
    this.phrases.push(this.createPhraseGroup());
  }

  removePhrase(index: number) {
    this.phrases.removeAt(index);
  }

  switchTab(tab: 'recognition' | 'synthesis') {
    this.activeTab = tab;
    this.updateUrl(this.playgroundForm.value);
  }

  // --- URL sync ---
  updateUrl(val: any) {
    const queryParamsToSave: any = { tab: this.activeTab };
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
      if (key === 'tab') continue;
      const control = this.playgroundForm.get(key);
      if (control instanceof FormArray) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            control.clear();
            parsed.forEach((item: any) => {
              if (key === 'phrases') {
                control.push(this.createPhraseGroup(item.phrase || '', item.boost ?? 2.0));
              } else {
                control.push(this.fb.control(item));
              }
            });
          }
        } catch (e) {}
      } else if (control) {
        if (value === 'true') patchValue[key] = true;
        else if (value === 'false') patchValue[key] = false;
        else if (!isNaN(value) && value !== '') patchValue[key] = Number(value);
        else patchValue[key] = value;
      }
    }
    this.playgroundForm.patchValue(patchValue);
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

  // ====================================================
  // SPEECH RECOGNITION
  // ====================================================

  getSpeechRecognition() {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }

  getRecognitionOptions() {
    const val = this.playgroundForm.value;
    return {
      langs: [val.lang],
      processLocally: val.processLocally,
      quality: val.quality,
    };
  }

  async checkAvailability() {
    const SR = this.getSpeechRecognition();
    if (!SR) {
      this.availabilityStatus = 'API not found.';
      return;
    }

    if (typeof SR.available !== 'function') {
      this.availabilityStatus = 'available';
      this.recognitionError = 'SpeechRecognition.available() is not supported in this browser — assuming cloud recognition is available.';
      return;
    }

    this.recognitionError = '';
    this.availabilityTimeMs = 0;
    const startTime = performance.now();
    this.availabilityTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.availabilityTimeMs = Math.floor(performance.now() - startTime);
        this.cdr.detectChanges();
      });
    }, 10);

    try {
      this.availabilityStatus = 'Checking...';
      const status = await SR.available(this.getRecognitionOptions());
      this.availabilityStatus = String(status);
    } catch (e: any) {
      this.availabilityStatus = 'Error';
      this.recognitionError = e.message || 'Availability check failed';
    } finally {
      clearInterval(this.availabilityTimer);
      this.availabilityTimeMs = Math.floor(performance.now() - startTime);
    }
  }

  async installModel() {
    const SR = this.getSpeechRecognition();
    if (!SR || typeof SR.install !== 'function') {
      this.installResult = 'install() not supported';
      return;
    }

    this.isInstalling = true;
    this.isDownloading = true;
    this.downloadProgress = 0;
    this.installResult = null;
    this.recognitionError = '';

    try {
      const result = await SR.install(this.getRecognitionOptions());
      this.installResult = result ? 'Model installed successfully' : 'Installation failed';
      if (result) this.availabilityStatus = 'available';
    } catch (e: any) {
      this.installResult = 'Error';
      this.recognitionError = e.message || 'Installation failed';
    } finally {
      this.isInstalling = false;
      this.isDownloading = false;
    }
  }

  startRecognition() {
    const SR = this.getSpeechRecognition();
    if (!SR) {
      this.recognitionError = 'SpeechRecognition API not found in this browser.';
      return;
    }

    const val = this.playgroundForm.value;
    this.recognitionError = '';
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.alternatives = [];
    this.recognitionLog = [];

    try {
      this.recognition = new SR();
      this.recognition.lang = val.lang;
      this.recognition.continuous = val.continuous;
      this.recognition.interimResults = val.interimResults;
      this.recognition.maxAlternatives = val.maxAlternatives;

      // On-device recognition (explainer: on-device-speech-recognition)
      try { this.recognition.processLocally = val.processLocally; } catch (e) {}

      // Contextual biasing (explainer: contextual-biasing)
      const Phrase = (window as any).SpeechRecognitionPhrase;
      if (val.phrases?.length && Phrase && this.recognition.phrases) {
        try {
          for (const p of val.phrases) {
            if (p.phrase) this.recognition.phrases.push(new Phrase(p.phrase, p.boost ?? 1.0));
          }
        } catch (e: any) {
          this.addRecognitionLog('phrases-skipped', e.message || 'Could not apply phrases');
        }
      }

      this.bindRecognitionEvents();
      this.recognition.start();
    } catch (e: any) {
      this.recognitionError = e.message || 'Failed to start recognition';
      this.isListening = false;
    }
  }

  private bindRecognitionEvents() {
    const r = this.recognition;

    r.onstart = () => this.ngZone.run(() => {
      this.isListening = true;
      this.addRecognitionLog('start', 'Recognition service started');
      this.cdr.detectChanges();
    });

    r.onaudiostart = () => this.ngZone.run(() => this.addRecognitionLog('audiostart', 'Audio capture started'));
    r.onspeechstart = () => this.ngZone.run(() => this.addRecognitionLog('speechstart', 'Speech detected'));
    r.onspeechend = () => this.ngZone.run(() => this.addRecognitionLog('speechend', 'Speech ended'));
    r.onaudioend = () => this.ngZone.run(() => this.addRecognitionLog('audioend', 'Audio capture ended'));
    r.onnomatch = () => this.ngZone.run(() => this.addRecognitionLog('nomatch', 'No confident match'));

    r.onresult = (event: any) => this.ngZone.run(() => {
      let interim = '';
      this.alternatives = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const best = result[0];
        if (result.isFinal) {
          this.finalTranscript += best.transcript + ' ';
          for (let j = 0; j < result.length; j++) {
            this.alternatives.push({
              transcript: result[j].transcript,
              confidence: result[j].confidence,
            });
          }
          this.addRecognitionLog('result (final)', `"${best.transcript.trim()}"`);
        } else {
          interim += best.transcript;
        }
      }
      this.interimTranscript = interim;
      this.cdr.detectChanges();
    });

    r.onerror = (event: any) => this.ngZone.run(() => {
      this.recognitionError = `${event.error}${event.message ? ': ' + event.message : ''}`;
      this.addRecognitionLog('error', this.recognitionError);
      this.cdr.detectChanges();
    });

    r.onend = () => this.ngZone.run(() => {
      this.isListening = false;
      this.addRecognitionLog('end', 'Recognition service ended');
      this.cdr.detectChanges();
    });
  }

  stopRecognition() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  abortRecognition() {
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.isListening = false;
    }
  }

  private addRecognitionLog(event: string, detail: string) {
    this.recognitionLog.unshift({ time: new Date().toLocaleTimeString(), event, detail });
    if (this.recognitionLog.length > 50) this.recognitionLog.pop();
  }

  clearTranscript() {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.alternatives = [];
  }

  // ====================================================
  // SPEECH SYNTHESIS
  // ====================================================

  loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    this.voices = synth.getVoices() || [];
    if (!this.voices.length) {
      synth.onvoiceschanged = () => {
        this.ngZone.run(() => {
          this.voices = synth.getVoices() || [];
          this.cdr.detectChanges();
        });
      };
    }
  }

  speak() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.synthesisError = 'speechSynthesis API not found in this browser.';
      return;
    }
    const synth = window.speechSynthesis;
    const val = this.playgroundForm.value;

    this.synthesisError = '';
    this.synthesisLog = [];

    try {
      synth.cancel();
      const utterance = new (window as any).SpeechSynthesisUtterance(val.synthesisText);
      utterance.lang = val.synthesisLang;
      utterance.rate = val.rate;
      utterance.pitch = val.pitch;
      utterance.volume = val.volume;

      if (val.voiceURI) {
        const voice = this.voices.find(v => v.voiceURI === val.voiceURI);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => this.ngZone.run(() => {
        this.isSpeaking = true;
        this.isPaused = false;
        this.addSynthesisLog('start', 'Speech started');
        this.cdr.detectChanges();
      });
      utterance.onend = () => this.ngZone.run(() => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.addSynthesisLog('end', 'Speech finished');
        this.cdr.detectChanges();
      });
      utterance.onpause = () => this.ngZone.run(() => {
        this.isPaused = true;
        this.addSynthesisLog('pause', 'Speech paused');
        this.cdr.detectChanges();
      });
      utterance.onresume = () => this.ngZone.run(() => {
        this.isPaused = false;
        this.addSynthesisLog('resume', 'Speech resumed');
        this.cdr.detectChanges();
      });
      utterance.onboundary = (e: any) => this.ngZone.run(() =>
        this.addSynthesisLog('boundary', `${e.name} @ char ${e.charIndex}`));
      utterance.onerror = (e: any) => this.ngZone.run(() => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.synthesisError = e.error || 'Synthesis error';
        this.addSynthesisLog('error', this.synthesisError);
        this.cdr.detectChanges();
      });

      this.currentUtterance = utterance;
      synth.speak(utterance);
    } catch (e: any) {
      this.synthesisError = e.message || 'Failed to start synthesis';
    }
  }

  pauseSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause();
  }

  resumeSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.resume();
  }

  cancelSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.isPaused = false;
  }

  private addSynthesisLog(event: string, detail: string) {
    this.synthesisLog.unshift({ time: new Date().toLocaleTimeString(), event, detail });
    if (this.synthesisLog.length > 50) this.synthesisLog.pop();
  }

  // ====================================================
  // GENERATED CODE
  // ====================================================

  updateGeneratedCode() {
    const val = this.playgroundForm.value;

    // --- Recognition ---
    let rec = `// Web Speech API — Speech Recognition\n`;
    rec += `const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;\n\n`;

    rec += `// On-device availability & install (explainer: on-device-speech-recognition + quality-levels)\n`;
    rec += `const options = {\n`;
    rec += `  langs: ["${val.lang}"],\n`;
    rec += `  processLocally: ${val.processLocally},\n`;
    rec += `  quality: "${val.quality}",\n`;
    rec += `};\n`;
    rec += `const availability = await SpeechRecognition.available(options);\n`;
    rec += `if (availability === "downloadable" || availability === "downloading") {\n`;
    rec += `  await SpeechRecognition.install(options);\n`;
    rec += `}\n\n`;

    rec += `const recognition = new SpeechRecognition();\n`;
    rec += `recognition.lang = "${val.lang}";\n`;
    rec += `recognition.continuous = ${val.continuous};\n`;
    rec += `recognition.interimResults = ${val.interimResults};\n`;
    rec += `recognition.maxAlternatives = ${val.maxAlternatives};\n`;
    rec += `recognition.processLocally = ${val.processLocally};\n\n`;

    if (val.phrases?.length) {
      rec += `// Contextual biasing (explainer: contextual-biasing)\n`;
      for (const p of val.phrases) {
        if (p.phrase) {
          rec += `recognition.phrases.push(new SpeechRecognitionPhrase(${JSON.stringify(p.phrase)}, ${p.boost ?? 1.0}));\n`;
        }
      }
      rec += `\n`;
    }

    rec += `recognition.onresult = (event) => {\n`;
    rec += `  for (let i = event.resultIndex; i < event.results.length; i++) {\n`;
    rec += `    const result = event.results[i];\n`;
    rec += `    console.log(result[0].transcript, result[0].confidence, result.isFinal);\n`;
    rec += `  }\n`;
    rec += `};\n`;
    rec += `recognition.onerror = (event) => console.error(event.error);\n`;
    rec += `recognition.onend = () => console.log("done");\n\n`;
    rec += `recognition.start();\n`;
    rec += `// recognition.stop();   // graceful stop\n`;
    rec += `// recognition.abort();  // immediate stop\n`;
    this.codeRecognition = rec;

    // --- Synthesis ---
    let syn = `// Web Speech API — Speech Synthesis\n`;
    syn += `const synth = window.speechSynthesis;\n\n`;
    syn += `const utterance = new SpeechSynthesisUtterance(${JSON.stringify(val.synthesisText)});\n`;
    syn += `utterance.lang = "${val.synthesisLang}";\n`;
    syn += `utterance.rate = ${val.rate};\n`;
    syn += `utterance.pitch = ${val.pitch};\n`;
    syn += `utterance.volume = ${val.volume};\n`;
    if (val.voiceURI) {
      syn += `\nconst voices = synth.getVoices();\n`;
      syn += `utterance.voice = voices.find(v => v.voiceURI === ${JSON.stringify(val.voiceURI)});\n`;
    }
    syn += `\nutterance.onstart = () => console.log("started");\n`;
    syn += `utterance.onend = () => console.log("finished");\n`;
    syn += `utterance.onboundary = (e) => console.log(e.name, e.charIndex);\n\n`;
    syn += `synth.speak(utterance);\n`;
    syn += `// synth.pause();\n`;
    syn += `// synth.resume();\n`;
    syn += `// synth.cancel();\n`;
    this.codeSynthesis = syn;
  }
}
