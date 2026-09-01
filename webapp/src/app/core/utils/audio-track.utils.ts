import { MediaSourceUtils } from './media-source.utils';

/** A decoded clip exposed as a silent, real-time MediaStreamTrack. */
export interface DecodedAudioTrack {
  track: MediaStreamTrack;
  durationSeconds: number;
  /** Starts feeding the track. Resolves once the whole clip has been played out. */
  play(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Turns a stored audio file into a MediaStreamTrack that can be handed to
 * `SpeechRecognition.start(audioTrack)`.
 *
 * The graph is connected to a MediaStreamDestination only — never to `context.destination` —
 * so the clip is fed to the recognizer without ever being audible.
 *
 * A MediaStreamDestination is used rather than `HTMLAudioElement.captureStream()` because it
 * is reliably silent, `decodeAudioData` rejects an unsupported codec up front, and the decoded
 * buffer gives the clip duration for the caller's watchdog.
 */
export class AudioTrackUtils {
  static async fromSource(source: Blob | string): Promise<DecodedAudioTrack> {
    const blob = typeof source === 'string' ? await MediaSourceUtils.fetchBlob(source) : source;
    const context = new AudioContext();

    // Never awaited: while the autoplay policy blocks a context, resume() stays pending
    // forever rather than rejecting. In the app the Run click has already given the page
    // sticky activation, so the context starts running; if it did not, the caller's watchdog
    // ends the attempt instead of hanging here.
    void context.resume().catch(() => {});

    let buffer: AudioBuffer;

    try {
      buffer = await context.decodeAudioData(await blob.arrayBuffer());
    } catch {
      await AudioTrackUtils.close(context);
      throw new Error('The audio could not be decoded. Chrome reads mp3, wav, ogg, flac, m4a and webm.');
    }

    const destination = context.createMediaStreamDestination();
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(destination);

    const track = destination.stream.getAudioTracks()[0];

    if (!track) {
      await AudioTrackUtils.close(context);
      throw new Error('The decoded audio produced no track.');
    }

    let started = false;
    let disposed = false;

    return {
      track,
      durationSeconds: buffer.duration,

      play: () => new Promise<void>((resolve) => {
        node.onended = () => resolve();
        started = true;
        node.start();
      }),

      dispose: async () => {
        if (disposed) {
          return;
        }
        disposed = true;

        if (started) {
          try { node.stop(); } catch {}
        }
        try { track.stop(); } catch {}
        await AudioTrackUtils.close(context);
      },
    };
  }

  private static async close(context: AudioContext): Promise<void> {
    try {
      await context.close();
    } catch {}
  }
}
