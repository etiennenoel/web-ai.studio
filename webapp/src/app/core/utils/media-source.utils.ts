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

  /**
   * Google's image CDN encodes the size it should serve in the URL, so a picture sitting in a
   * sheet cell arrives as a downscaled thumbnail of whatever was uploaded. Two encodings are in
   * the wild — a trailing directive (`=s220`, `=w624-h351-rw`) and a newer parameter segment
   * (`/w=624,h=351,f=jpg,q=85`) — and `s0` asks either of them for the original.
   *
   * Returns every plausible full-size variant, most likely first; empty when the host is not
   * Google's, so the caller can skip the extra requests.
   */
  static googleFullSizeVariants(source: string): string[] {
    if (!/^https?:\/\/[^/]*\.googleusercontent\.com\//i.test(source)) {
      return [];
    }

    const variants: string[] = [];
    const add = (candidate: string) => {
      if (candidate !== source && !variants.includes(candidate)) {
        variants.push(candidate);
      }
    };

    if (/=[\w-]*$/.test(source)) {
      add(source.replace(/=[\w-]*$/, '=s0'));
    } else {
      add(`${source}=s0`);
    }

    // Newer docs form: the whole trailing segment is a parameter list, so replace it wholesale.
    // It must look like one (`w=624,h=351,f=jpg`), or every URL would spawn junk variants.
    const cut = source.lastIndexOf('/');
    const tail = source.slice(cut + 1);

    if (cut > 8 && tail.includes(',') && tail.includes('=')) {
      add(`${source.slice(0, cut)}=s0`);
      add(`${source.slice(0, cut)}/s0`);
    }

    return variants;
  }

  /** Reads an image's real pixel size, or null when it cannot be decoded. */
  static async imageSize(source: string | Blob): Promise<{width: number, height: number} | null> {
    try {
      const blob = typeof source === 'string' ? await MediaSourceUtils.fetchBlob(source) : source;
      const bitmap = await createImageBitmap(blob);
      const size = {width: bitmap.width, height: bitmap.height};

      bitmap.close();

      return size;
    } catch {
      return null;
    }
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
