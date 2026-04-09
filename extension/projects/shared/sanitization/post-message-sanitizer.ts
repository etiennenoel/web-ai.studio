/**
 * Sanitizes arbitrary objects for safe transport via window.postMessage.
 *
 * Why this is needed: window.postMessage uses the structured clone algorithm,
 * which cannot handle functions, Symbols, certain DOM objects, or circular references.
 * Additionally, we want to convert image/audio sources into serializable representations
 * (data URLs) so they can be stored in IndexedDB and displayed in the devtools panel.
 *
 * This class handles:
 * - EventTarget instances (replaced with a type marker)
 * - ReadableStream instances (replaced with a type marker)
 * - ImageBitmap, ImageData, HTMLImageElement, HTMLVideoElement, HTMLCanvasElement, OffscreenCanvas
 *   (converted to PNG data URLs via OffscreenCanvas)
 * - Blob instances (converted to data URLs via FileReader)
 * - ArrayBuffer / TypedArray (replaced with byte length marker)
 * - Functions and Symbols (stripped)
 * - Recursive objects with depth limiting
 * - Objects with toJSON() methods
 * - Primitive wrapper objects (String, Number, Boolean)
 */
export class PostMessageSanitizer {
  /**
   * Recursively sanitizes an object for safe postMessage transport.
   *
   * @param obj - The value to sanitize.
   * @param maxDepth - Maximum recursion depth to prevent infinite loops (default: 10).
   * @returns A promise resolving to a structurally-cloneable representation.
   */
  static async sanitize(obj: unknown, maxDepth: number = 10): Promise<unknown> {
    if (maxDepth < 0) return undefined;
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') {
      if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
      return obj;
    }

    // EventTarget (but not image/video/canvas elements which we handle specially)
    if (
      obj instanceof EventTarget &&
      !(obj instanceof HTMLImageElement || obj instanceof HTMLVideoElement || obj instanceof HTMLCanvasElement)
    ) {
      return { __type: 'EventTarget' };
    }

    if (obj instanceof ReadableStream) return { __type: 'ReadableStream' };

    // Image-like sources -> convert to PNG data URL
    if (PostMessageSanitizer.isImageSource(obj)) {
      return PostMessageSanitizer.sanitizeImageSource(obj);
    }

    // Blob -> convert to data URL
    if (typeof Blob !== 'undefined' && obj instanceof Blob) {
      return PostMessageSanitizer.sanitizeBlob(obj);
    }

    // ArrayBuffer / TypedArray -> just record byte length
    if (typeof ArrayBuffer !== 'undefined' && (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer)) {
      return { __type: 'BufferData', byteLength: (obj as ArrayBuffer).byteLength };
    }

    // Arrays
    if (Array.isArray(obj)) {
      return PostMessageSanitizer.sanitizeArray(obj, maxDepth);
    }

    // Objects with toJSON()
    if (typeof (obj as any).toJSON === 'function') {
      try {
        return PostMessageSanitizer.sanitize((obj as any).toJSON(), maxDepth - 1);
      } catch {
        // Fall through to generic object handling
      }
    }

    return PostMessageSanitizer.sanitizeObject(obj as Record<string, unknown>, maxDepth);
  }

  /**
   * Checks whether the given value is an image-like source that can be drawn onto
   * a canvas for conversion to a data URL.
   */
  private static isImageSource(obj: unknown): boolean {
    return (
      (typeof window !== 'undefined' && 'ImageBitmap' in window && obj instanceof (window as any).ImageBitmap) ||
      (typeof window !== 'undefined' && 'ImageData' in window && obj instanceof (window as any).ImageData) ||
      (typeof window !== 'undefined' && 'HTMLImageElement' in window && obj instanceof (window as any).HTMLImageElement) ||
      (typeof window !== 'undefined' && 'HTMLVideoElement' in window && obj instanceof (window as any).HTMLVideoElement) ||
      (typeof window !== 'undefined' && 'HTMLCanvasElement' in window && obj instanceof (window as any).HTMLCanvasElement) ||
      (typeof window !== 'undefined' && 'OffscreenCanvas' in window && obj instanceof (window as any).OffscreenCanvas)
    );
  }

  /**
   * Converts an image source (ImageBitmap, ImageData, HTMLImageElement, etc.)
   * to a serializable object with a PNG data URL.
   *
   * Falls back gracefully if canvas drawing fails (e.g., due to CORS tainting)
   * or if the source has zero dimensions.
   */
  private static async sanitizeImageSource(obj: any): Promise<unknown> {
    let width = obj.width;
    let height = obj.height;

    // Different source types expose dimensions via different properties
    if (typeof HTMLVideoElement !== 'undefined' && obj instanceof HTMLVideoElement) {
      width = obj.videoWidth;
      height = obj.videoHeight;
    } else if (typeof HTMLImageElement !== 'undefined' && obj instanceof HTMLImageElement) {
      width = obj.naturalWidth || obj.width;
      height = obj.naturalHeight || obj.height;
    }

    try {
      if (width > 0 && height > 0) {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (typeof window !== 'undefined' && 'ImageData' in window && obj instanceof (window as any).ImageData) {
            ctx.putImageData(obj, 0, 0);
          } else {
            ctx.drawImage(obj as any, 0, 0, width, height);
          }
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          const dataUrl = await PostMessageSanitizer.blobToDataUrl(blob);
          return { __type: 'Blob', size: blob.size, type: 'image/png', dataUrl, width, height };
        }
      }
    } catch {
      // Canvas manipulation failed (e.g., CORS tainting) - fall through to fallbacks
    }

    // Fallback: use the element's src attribute if available
    if (typeof HTMLImageElement !== 'undefined' && obj instanceof HTMLImageElement && obj.src) {
      return { __type: 'Blob', size: 0, type: 'image/png', dataUrl: obj.src, width, height };
    }
    if (typeof HTMLVideoElement !== 'undefined' && obj instanceof HTMLVideoElement && (obj.src || obj.currentSrc)) {
      return { __type: 'Blob', size: 0, type: 'video/mp4', dataUrl: obj.currentSrc || obj.src, width, height };
    }

    // Ultimate fallback: no data URL available
    return { __type: 'Blob', size: 0, type: 'image/png', width, height };
  }

  /** Converts a Blob to a serializable object with a data URL. */
  private static async sanitizeBlob(blob: Blob): Promise<unknown> {
    try {
      const dataUrl = await PostMessageSanitizer.blobToDataUrl(blob);
      return { __type: 'Blob', size: blob.size, type: blob.type, dataUrl };
    } catch {
      return { __type: 'Blob', size: blob.size, type: blob.type };
    }
  }

  /** Recursively sanitizes each element of an array. */
  private static async sanitizeArray(arr: unknown[], maxDepth: number): Promise<unknown[]> {
    const result: unknown[] = [];
    for (const item of arr) {
      if (item === undefined || item === null) {
        result.push(item);
      } else {
        result.push(await PostMessageSanitizer.sanitize(item, maxDepth - 1));
      }
    }
    return result;
  }

  /**
   * Sanitizes a generic object by walking its own and inherited properties,
   * stripping functions, and recursing into nested values.
   *
   * Handles primitive wrapper objects (new String(), new Number(), new Boolean())
   * by unwrapping them to their valueOf() when they have no enumerable properties.
   */
  private static async sanitizeObject(obj: Record<string, unknown>, maxDepth: number): Promise<unknown> {
    const isPrimitiveWrapper = obj instanceof String || obj instanceof Number || obj instanceof Boolean;

    const result: Record<string, unknown> = {};
    let hasProps = false;

    let currentObj: any = obj;
    const seenProps = new Set<string>();

    while (
      currentObj &&
      currentObj !== Object.prototype &&
      currentObj !== String.prototype &&
      currentObj !== Number.prototype &&
      currentObj !== Boolean.prototype
    ) {
      for (const key of Object.getOwnPropertyNames(currentObj)) {
        if (key === 'constructor' || seenProps.has(key)) continue;

        // Skip array-like index properties and length on String wrappers
        if (isPrimitiveWrapper && (!isNaN(parseInt(key)) || key === 'length')) continue;

        seenProps.add(key);
        try {
          const val = (obj as any)[key];
          if (typeof val !== 'function') {
            hasProps = true;
            result[key] = await PostMessageSanitizer.sanitize(val, maxDepth - 1);
          }
        } catch {
          // Some property accessors may throw - skip them
        }
      }
      currentObj = Object.getPrototypeOf(currentObj);
    }

    if (!hasProps) {
      if (isPrimitiveWrapper) return (obj as any).valueOf();
      if (typeof (obj as any).toString === 'function' && (obj as any).toString !== Object.prototype.toString) {
        try {
          return (obj as any).toString();
        } catch {
          // Fall through
        }
      }
    }

    if (isPrimitiveWrapper && hasProps) {
      result.__value = (obj as any).valueOf();
    }

    return result;
  }

  /** Reads a Blob as a data URL string via FileReader. */
  private static blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}
