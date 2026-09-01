/**
 * A media source in this app is always a string, so that it survives a spreadsheet paste,
 * a JSON round-trip and a form control. It is one of three things:
 *
 *   - a `data:` URL, produced when a file is dropped or picked;
 *   - an absolute `http(s)` URL, pasted from a sheet;
 *   - an app-relative path, e.g. `images/cortex/speeches/spontaneous-speech-en-46.mp3`.
 *
 * `fetch` resolves all three identically, so one helper covers every consumer.
 */
export class MediaSourceUtils {
  static async fetchBlob(source: string): Promise<Blob> {
    const response = await fetch(source);

    if (!response.ok) {
      throw new Error(`Could not load "${MediaSourceUtils.describe(source)}" (HTTP ${response.status}).`);
    }

    return await response.blob();
  }

  static blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
      reader.readAsDataURL(blob);
    });
  }

  static isDataUrl(source: string): boolean {
    return source.startsWith('data:');
  }

  static isAbsoluteUrl(source: string): boolean {
    return /^https?:\/\//i.test(source);
  }

  /** A bare path or URL that looks like it points at a media file of the given kind. */
  static looksLikePath(source: string, kind: 'image' | 'audio'): boolean {
    const extensions = kind === 'image'
      ? /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i
      : /\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|webm)(\?.*)?$/i;

    const candidate = source.trim();

    if (!candidate || /\s/.test(candidate)) {
      return false;
    }

    return MediaSourceUtils.isAbsoluteUrl(candidate) || extensions.test(candidate);
  }

  /** A short label for error messages — a data URL would otherwise dump megabytes. */
  static describe(source: string): string {
    if (MediaSourceUtils.isDataUrl(source)) {
      return `${source.slice(0, source.indexOf(';') > 0 ? source.indexOf(';') : 20)} file`;
    }

    return source.length > 80 ? `${source.slice(0, 77)}...` : source;
  }
}
