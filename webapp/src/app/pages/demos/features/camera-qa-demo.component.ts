import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BaseDemoComponent } from '../components/base-demo/base-demo.component';
import { DEMOS_DATA } from '../../../core/services/demos.data';
import { PromptInputStateEnum } from '../../../core/enums/prompt-input-state.enum';

declare const LanguageModel: any;

@Component({
  selector: 'app-camera-qa-demo',
  templateUrl: './camera-qa-demo.component.html',
  standalone: false,
  host: { class: 'block h-full' }
})
export class CameraQaDemoComponent extends BaseDemoComponent implements OnInit {
  demo = DEMOS_DATA.find(d => d.id === 'camera-qa')!;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('snapshot') snapshotRef!: ElementRef<HTMLCanvasElement>;

  cameraState: 'idle' | 'starting' | 'live' | 'denied' | 'unavailable' = 'idle';
  hasSnapshot = false;

  question = 'What do you see in this picture?';
  answer = '';
  errorMessage = '';

  sampleQuestions = [
    'What do you see in this picture?',
    'What am I holding up to the camera?',
    'Read any text visible in this image.',
    'What color is the most prominent object?'
  ];

  private mediaStream: MediaStream | null = null;

  override async ngOnInit() {
    super.ngOnInit();
    this.setTitle(`Demo: ${this.demo.title}`);
    if (isPlatformServer(this.platformId)) return;
    await this.checkAvailability([{ type: 'image' }]);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraState = 'unavailable';
    }
  }

  get statusPills() {
    return [{ name: 'Prompt API (image)', status: this.languageModelAvailability }];
  }

  async startCamera() {
    if (this.cameraState === 'live' || this.cameraState === 'starting') return;
    this.cameraState = 'starting';
    this.errorMessage = '';
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.cameraState = 'live';
      // Let the video element render before attaching the stream.
      setTimeout(() => {
        if (this.videoRef?.nativeElement && this.mediaStream) {
          this.videoRef.nativeElement.srcObject = this.mediaStream;
        }
      });
    } catch (e: any) {
      this.cameraState = e.name === 'NotAllowedError' ? 'denied' : 'unavailable';
      this.errorMessage = e.name === 'NotAllowedError'
        ? 'Camera access was denied. Allow the camera to use this demo.'
        : (e.message || 'Could not start the camera.');
    }
  }

  stopCamera() {
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.cameraState = 'idle';
  }

  private captureFrame(): HTMLCanvasElement | null {
    const video = this.videoRef?.nativeElement;
    const canvas = this.snapshotRef?.nativeElement;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return canvas;
  }

  useSample(sample: string) {
    this.question = sample;
    this.captureAndAsk();
  }

  async captureAndAsk() {
    const q = this.question.trim();
    if (!q || this.cameraState !== 'live' || this.state === PromptInputStateEnum.Inferencing) return;
    if (this.languageModelAvailability === 'unavailable') {
      this.errorMessage = 'The Prompt API is unavailable in this browser.';
      return;
    }

    const canvas = this.captureFrame();
    if (!canvas) {
      this.errorMessage = 'Could not capture a frame — is the camera ready?';
      return;
    }
    this.hasSnapshot = true;

    this.state = PromptInputStateEnum.Inferencing;
    this.answer = '';
    this.errorMessage = '';
    this.ttft = null;
    this.totalTime = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    try {
      const bitmap = await createImageBitmap(canvas);
      const session = await LanguageModel.create({
        expectedInputs: [{ type: 'image' }]
      });

      const stream = session.promptStreaming([{
        role: 'user',
        content: [
          { type: 'text', value: q },
          { type: 'image', value: bitmap }
        ]
      }], { signal: this.abortController.signal });

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now();
          this.ttft = Math.round(firstTokenTime - startTime);
        }
        this.answer += chunk;
      }
      this.totalTime = Math.round(performance.now() - startTime);
      session.destroy?.();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        this.errorMessage = e.message || 'Could not answer the question.';
      }
    } finally {
      this.state = PromptInputStateEnum.Ready;
      this.abortController = null;
    }
  }

  override ngOnDestroy() {
    this.stopCamera();
    super.ngOnDestroy();
  }

  get dynamicCodeSnippet(): string {
    const q = this.question.trim() || this.sampleQuestions[0];
    return `// 1. Show the camera — the feed never leaves the device
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" }
});
videoElement.srcObject = stream;

// 2. Freeze a frame when the user asks
canvas.getContext("2d").drawImage(videoElement, 0, 0);
const bitmap = await createImageBitmap(canvas);

// 3. Ask the on-device model about it
const session = await LanguageModel.create({
  expectedInputs: [{ type: "image" }]
});

const answer = session.promptStreaming([{
  role: "user",
  content: [
    { type: "text", value: ${JSON.stringify(q)} },
    { type: "image", value: bitmap }
  ]
}]);

for await (const chunk of answer) {
  render(chunk);
}`;
  }
}
