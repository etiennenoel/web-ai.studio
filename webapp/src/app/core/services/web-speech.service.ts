import { Injectable, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AudioTrackUtils, DecodedAudioTrack } from '../utils/audio-track.utils';

export type SpeechQuality = 'command' | 'dictation' | 'conversation';

/** Milliseconds to keep listening after the clip ends, so the last result can finalize. */
const TRANSCRIPTION_TAIL_MS = 700;

/** Grace period on top of the clip duration before a stalled recognizer is aborted. */
const TRANSCRIPTION_GRACE_MS = 15000;

export interface SpeechRecognitionConfig {
  lang?: string;
  quality?: SpeechQuality;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  phrases?: { phrase: string; boost: number }[];
}

/**
 * Thin wrapper around the Web Speech API focused on on-device recognition
 * (processLocally: true) with the quality-tier and contextual-biasing explainers.
 */
@Injectable({
  providedIn: 'root'
})
export class WebSpeechService {
  private isBrowser: boolean;

  private audioTrackSupport?: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private getRecognitionCtor(): any {
    if (!this.isBrowser) return undefined;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }

  isSupported(): boolean {
    return !!this.getRecognitionCtor();
  }

  private toOptions(config: SpeechRecognitionConfig) {
    return {
      langs: [config.lang ?? 'en-US'],
      processLocally: true,
      quality: config.quality ?? 'dictation'
    };
  }

  /** Availability of ON-DEVICE recognition for the given language and quality tier. */
  async available(config: SpeechRecognitionConfig = {}): Promise<string> {
    const SR = this.getRecognitionCtor();
    if (!SR) return 'unavailable';
    // Without available(), on-device support cannot be guaranteed.
    if (typeof SR.available !== 'function') return 'unavailable';
    try {
      return String(await SR.available(this.toOptions(config)));
    } catch {
      return 'unavailable';
    }
  }

  /** Downloads the on-device model for the given language and quality tier. */
  async install(config: SpeechRecognitionConfig = {}): Promise<boolean> {
    const SR = this.getRecognitionCtor();
    if (!SR || typeof SR.install !== 'function') return false;
    return await SR.install(this.toOptions(config));
  }

  /**
   * Builds a configured recognizer. The caller owns it: bind events (wrapped in
   * NgZone.run for change detection), then call start()/stop()/abort().
   */
  createRecognizer(config: SpeechRecognitionConfig = {}): any {
    const SR = this.getRecognitionCtor();
    if (!SR) throw new Error('SpeechRecognition is not supported in this browser.');

    const recognition = new SR();
    const options = this.toOptions(config);

    // Options dict per the on-device-speech-recognition + quality-levels explainers.
    try { recognition.options = options; } catch {}
    // Backwards compat with the older explainer pattern.
    try { recognition.processLocally = true; } catch {}

    recognition.lang = config.lang ?? 'en-US';
    recognition.continuous = config.continuous ?? false;
    recognition.interimResults = config.interimResults ?? true;
    recognition.maxAlternatives = config.maxAlternatives ?? 1;

    const Phrase = (window as any).SpeechRecognitionPhrase;
    if (config.phrases?.length && Phrase && recognition.phrases) {
      try {
        for (const p of config.phrases) {
          if (p.phrase.trim()) recognition.phrases.push(new Phrase(p.phrase.trim(), p.boost));
        }
      } catch {}
    }

    return recognition;
  }

  supportsContextualBiasing(): boolean {
    return this.isBrowser && !!(window as any).SpeechRecognitionPhrase;
  }

  /**
   * Captures a single utterance and resolves with the final transcript.
   * onInterim receives live partial transcripts. Callbacks run inside the Angular zone.
   */
  listenOnce(config: SpeechRecognitionConfig = {}, onInterim?: (text: string) => void): { result: Promise<string>; abort: () => void } {
    const recognition = this.createRecognizer({ ...config, continuous: false, interimResults: true });

    const result = new Promise<string>((resolve, reject) => {
      let finalTranscript = '';

      recognition.onresult = (event: any) => this.ngZone.run(() => {
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript;
          else interim += transcript;
        }
        if (interim && onInterim) onInterim(interim);
      });

      recognition.onerror = (event: any) => this.ngZone.run(() => {
        reject(new Error(event.error === 'no-speech' ? 'No speech detected.' : event.error));
      });

      recognition.onend = () => this.ngZone.run(() => resolve(finalTranscript.trim()));
    });

    recognition.start();
    return { result, abort: () => { try { recognition.abort(); } catch {} } };
  }

  /**
   * Whether start() accepts a MediaStreamTrack, i.e. whether a stored file can be transcribed
   * without a microphone.
   *
   * The WebIDL arity is 0 with or without the overload, so there is nothing to introspect. The
   * one observable difference is argument validation: with the overload, a non-track argument
   * is rejected with a TypeError; without it, the extra argument is ignored and start() quietly
   * opens the microphone instead. The probe therefore passes a deliberately invalid argument
   * and aborts in the same task, so no capture ever begins.
   */
  supportsAudioTrackInput(): boolean {
    if (this.audioTrackSupport !== undefined) {
      return this.audioTrackSupport;
    }

    const SR = this.getRecognitionCtor();

    if (!SR) {
      return (this.audioTrackSupport = false);
    }

    const probe = new SR();

    try {
      probe.start({} as any);
      // The argument was ignored, so only the no-argument overload exists.
      this.audioTrackSupport = false;
    } catch (e) {
      this.audioTrackSupport = e instanceof TypeError;
    } finally {
      try { probe.abort(); } catch {}
    }

    return this.audioTrackSupport;
  }

  /**
   * Transcribes a stored audio file with the on-device model. The clip is decoded into a
   * silent MediaStreamTrack and handed to start(audioTrack) — the microphone is never opened,
   * so a batch of clips transcribes unattended and reproducibly.
   *
   * onUpdate receives the running transcript (finals plus the current interim) inside the
   * Angular zone. Playback is real time, so a 60s clip takes about 60s.
   */
  transcribe(
    source: Blob | string,
    config: SpeechRecognitionConfig = {},
    onUpdate?: (text: string) => void
  ): { result: Promise<string>; abort: () => void } {
    let recognition: any = null;
    let clip: DecodedAudioTrack | null = null;
    let aborted = false;

    const abort = () => {
      aborted = true;
      try { recognition?.abort(); } catch {}
      void clip?.dispose();
    };

    const result = (async () => {
      if (!this.isSupported()) {
        throw new Error('SpeechRecognition is not supported in this browser.');
      }

      if (!this.supportsAudioTrackInput()) {
        throw new Error(
          'This Chrome build cannot transcribe an audio track — SpeechRecognition.start(MediaStreamTrack) is unavailable.'
        );
      }

      clip = await AudioTrackUtils.fromSource(source);

      if (aborted) {
        await clip.dispose();
        throw new Error('Transcription was cancelled.');
      }

      try {
        return await this.runRecognition(clip, config, onUpdate, (instance) => (recognition = instance));
      } finally {
        await clip.dispose();
      }
    })();

    return { result, abort };
  }

  private runRecognition(
    clip: DecodedAudioTrack,
    config: SpeechRecognitionConfig,
    onUpdate: ((text: string) => void) | undefined,
    register: (recognition: any) => void
  ): Promise<string> {
    const recognition = this.createRecognizer({
      ...config,
      quality: config.quality ?? 'dictation',
      // A whole clip is many utterances, so a single-shot recognizer would stop at the first one.
      continuous: true,
      interimResults: true,
    });

    register(recognition);

    return new Promise<string>((resolve, reject) => {
      let finalTranscript = '';
      let settled = false;
      let watchdog: any = null;
      let tail: any = null;

      const settle = (action: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(watchdog);
        clearTimeout(tail);
        action();
      };

      recognition.onresult = (event: any) => this.ngZone.run(() => {
        // With continuous: true the results list is cumulative, so it is rebuilt each event
        // rather than appended to.
        let finals = '';
        let interim = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finals += transcript;
          } else {
            interim += transcript;
          }
        }

        finalTranscript = finals;
        onUpdate?.((finals + interim).trim());
      });

      recognition.onerror = (event: any) => this.ngZone.run(() => {
        const code = event.error;

        // A long silence mid-clip also raises no-speech, so anything already transcribed wins.
        if (code === 'no-speech') {
          settle(() => finalTranscript.trim()
            ? resolve(finalTranscript.trim())
            : reject(new Error('No speech was detected in this clip.')));
          return;
        }

        settle(() => reject(new Error(
          code === 'aborted' ? 'Transcription was cancelled.' : `Recognition error: ${code}`
        )));
      });

      recognition.onend = () => this.ngZone.run(() => {
        settle(() => resolve(finalTranscript.trim()));
      });

      try {
        recognition.start(clip.track);
      } catch (e: any) {
        settle(() => reject(e instanceof Error ? e : new Error(String(e))));
        return;
      }

      watchdog = setTimeout(
        () => settle(() => {
          try { recognition.abort(); } catch {}
          reject(new Error('Transcription timed out.'));
        }),
        clip.durationSeconds * 1000 + TRANSCRIPTION_TAIL_MS + TRANSCRIPTION_GRACE_MS
      );

      clip.play().then(() => {
        // stop() rather than abort(), so the recognizer emits its last final result.
        tail = setTimeout(() => { try { recognition.stop(); } catch {} }, TRANSCRIPTION_TAIL_MS);
      });
    });
  }
}
