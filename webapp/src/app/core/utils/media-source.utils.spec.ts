import { MediaSourceUtils } from './media-source.utils';

describe('MediaSourceUtils', () => {
  describe('looksLikePath', () => {
    it('should accept an app-relative media path', () => {
      expect(MediaSourceUtils.looksLikePath('images/cortex/speeches/spontaneous-speech-en-46.mp3', 'audio')).toBeTrue();
      expect(MediaSourceUtils.looksLikePath('images/cortex/cat.png', 'image')).toBeTrue();
    });

    it('should accept an absolute URL', () => {
      expect(MediaSourceUtils.looksLikePath('https://example.com/clip', 'audio')).toBeTrue();
    });

    it('should reject prose and the wrong media kind', () => {
      expect(MediaSourceUtils.looksLikePath('transcribe this clip', 'audio')).toBeFalse();
      expect(MediaSourceUtils.looksLikePath('cat.png', 'audio')).toBeFalse();
      expect(MediaSourceUtils.looksLikePath('', 'image')).toBeFalse();
    });
  });

  describe('isDataUrl / isAbsoluteUrl', () => {
    it('should tell the three source shapes apart', () => {
      expect(MediaSourceUtils.isDataUrl('data:image/png;base64,AAA')).toBeTrue();
      expect(MediaSourceUtils.isAbsoluteUrl('https://example.com/a.png')).toBeTrue();
      expect(MediaSourceUtils.isAbsoluteUrl('images/a.png')).toBeFalse();
      expect(MediaSourceUtils.isDataUrl('images/a.png')).toBeFalse();
    });
  });

  describe('upgradeGoogleImageUrl', () => {
    it('should swap a size directive for the original', () => {
      expect(MediaSourceUtils.upgradeGoogleImageUrl('https://lh3.googleusercontent.com/abc=s220'))
        .toBe('https://lh3.googleusercontent.com/abc=s0');
      expect(MediaSourceUtils.upgradeGoogleImageUrl('https://lh7-rt.googleusercontent.com/docsz/AD_4nX=w624-h351-rw'))
        .toBe('https://lh7-rt.googleusercontent.com/docsz/AD_4nX=s0');
    });

    it('should append one when the URL carries no size', () => {
      expect(MediaSourceUtils.upgradeGoogleImageUrl('https://lh3.googleusercontent.com/abc'))
        .toBe('https://lh3.googleusercontent.com/abc=s0');
    });

    it('should leave other hosts alone', () => {
      expect(MediaSourceUtils.upgradeGoogleImageUrl('https://example.com/cat=s220')).toBeNull();
      expect(MediaSourceUtils.upgradeGoogleImageUrl('images/cortex/cat.png')).toBeNull();
    });
  });

  describe('describe', () => {
    it('should not dump a whole data URL into an error message', () => {
      const label = MediaSourceUtils.describe(`data:image/png;base64,${'A'.repeat(5000)}`);
      expect(label.length).toBeLessThan(40);
    });

    it('should truncate a long URL', () => {
      expect(MediaSourceUtils.describe(`https://example.com/${'a'.repeat(200)}`).length).toBe(80);
    });
  });

  describe('blobToDataUrl', () => {
    it('should round-trip a blob', async () => {
      const dataUrl = await MediaSourceUtils.blobToDataUrl(new Blob(['hello'], { type: 'text/plain' }));
      expect(dataUrl).toBe('data:text/plain;base64,aGVsbG8=');
    });
  });

  describe('fetchBlob', () => {
    it('should read a data URL', async () => {
      const blob = await MediaSourceUtils.fetchBlob('data:text/plain;base64,aGVsbG8=');
      expect(await blob.text()).toBe('hello');
    });

    it('should name the source when the request fails', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));

      await expectAsync(MediaSourceUtils.fetchBlob('images/missing.mp3'))
        .toBeRejectedWithError(/images\/missing\.mp3.*404/);
    });
  });
});
