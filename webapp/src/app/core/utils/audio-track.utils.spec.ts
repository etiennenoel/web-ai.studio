import { AudioTrackUtils } from './audio-track.utils';

/** A tiny mono PCM wav, as a data URL — enough for decodeAudioData to accept. */
function wavDataUrl(seconds = 0.2, sampleRate = 8000): string {
  const samples = Math.floor(seconds * sampleRate);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);

  for (let i = 0; i < samples; i++) {
    view.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0x3fff), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

describe('AudioTrackUtils', () => {
  it('should decode a data URL into a live audio track', async () => {
    const clip = await AudioTrackUtils.fromSource(wavDataUrl(0.2));

    expect(clip.track.kind).toBe('audio');
    expect(clip.track.readyState).toBe('live');
    expect(clip.durationSeconds).toBeCloseTo(0.2, 1);

    await clip.dispose();
  });

  it('should decode a Blob as well as a string', async () => {
    const blob = await (await fetch(wavDataUrl(0.1))).blob();
    const clip = await AudioTrackUtils.fromSource(blob);

    expect(clip.track.kind).toBe('audio');

    await clip.dispose();
  });

  it('should end the track on dispose', async () => {
    const clip = await AudioTrackUtils.fromSource(wavDataUrl(0.1));

    await clip.dispose();

    expect(clip.track.readyState).toBe('ended');
  });

  it('should tolerate a second dispose', async () => {
    const clip = await AudioTrackUtils.fromSource(wavDataUrl(0.1));

    await clip.dispose();
    await expectAsync(clip.dispose()).toBeResolved();
  });

  it('should start playback without throwing', async () => {
    const clip = await AudioTrackUtils.fromSource(wavDataUrl(0.1));

    // Not awaited: whether the buffer actually drains depends on the browser's autoplay
    // state, which in the app is settled by the Run click.
    expect(() => void clip.play()).not.toThrow();

    await clip.dispose();
  });

  it('should reject audio it cannot decode', async () => {
    await expectAsync(AudioTrackUtils.fromSource('data:audio/wav;base64,QUJD'))
      .toBeRejectedWithError(/could not be decoded/);
  });
});
