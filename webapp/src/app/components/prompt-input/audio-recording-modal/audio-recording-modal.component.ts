import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-audio-recording-modal',
  templateUrl: './audio-recording-modal.component.html',
  standalone: false
})
export class AudioRecordingModalComponent implements OnInit, OnDestroy {
  stream: MediaStream | null = null;
  recorder: MediaRecorder | null = null;
  chunks: Blob[] = [];
  isRecording = false;
  recordingTime = 0;
  timerInterval: any;
  error: string | null = null;

  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  source: MediaStreamAudioSourceNode | null = null;
  animationFrameId: number | null = null;
  volumeLevel = 0;

  constructor(public activeModal: NgbActiveModal) {}

  async ngOnInit() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      this.error = e.message || 'Could not access microphone.';
    }
  }

  setupAudioAnalysis(stream: MediaStream) {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    
    // Resume context if it was suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.analyzeAudio();
  }

  analyzeAudio = () => {
    if (!this.analyser || !this.isRecording) {
      this.volumeLevel = 0;
      return;
    }
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    this.volumeLevel = average; // 0 to ~255

    this.animationFrameId = requestAnimationFrame(this.analyzeAudio);
  }

  startRecording() {
    if (!this.stream) return;
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    
    this.recorder.onstop = () => {
      // Create the Blob when stopped using the exact mimeType the browser chose
      const mimeType = this.recorder?.mimeType || 'audio/webm';
      const blob = new Blob(this.chunks, { type: mimeType });
      
      // We explicitly need the .webm or appropriate extension 
      const extension = mimeType.includes('mp4') ? 'mp4' : (mimeType.includes('ogg') ? 'ogg' : 'webm');
      const file = new File([blob], `audio-recording.${extension}`, { type: mimeType });
      
      this.activeModal.close(file);
    };
    
    // Start data collection (no timeslice means it fires ondataavailable once when stopped)
    this.recorder.start(); 
    this.isRecording = true;
    this.recordingTime = 0;
    
    // Start visualizer
    this.setupAudioAnalysis(this.stream);

    this.timerInterval = setInterval(() => {
      this.recordingTime++;
    }, 1000);
  }

  stopRecording() {
    if (this.recorder && this.isRecording) {
      this.recorder.stop();
      this.isRecording = false;
      this.volumeLevel = 0;
      clearInterval(this.timerInterval);
    }
  }

  ngOnDestroy() {
    this.stopRecording();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get visualizerScale(): number {
    const baseScale = 1;
    const maxAdditionalScale = 0.5; // Will scale up to 1.5x at max volume
    const maxVolume = 150; 
    const normalizedVolume = Math.min(this.volumeLevel / maxVolume, 1);
    return baseScale + (normalizedVolume * maxAdditionalScale);
  }
}
