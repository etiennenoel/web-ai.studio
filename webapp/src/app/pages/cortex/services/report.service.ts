import { Injectable } from '@angular/core';

/**
 * Handles the serialization, compression, and I/O of Cortex benchmark reports.
 *
 * Why this exists: Report import/export involves non-trivial compression (deflate-raw),
 * base64url encoding, file download triggering, and file parsing — all pure I/O logic
 * that was mixed into the Cortex page component alongside view state management.
 * Extracting it makes the page component simpler and keeps the serialization logic
 * testable in isolation.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {

  /**
   * Compresses a report data object and encodes it as a base64url string
   * suitable for embedding in a URL query parameter.
   *
   * Uses the browser's CompressionStream API with deflate-raw to shrink
   * the JSON payload significantly before base64 encoding.
   */
  async compressToBase64Url(reportData: object): Promise<string> {
    const jsonString = JSON.stringify(reportData);

    const stream = new Blob([jsonString]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('deflate-raw'));
    const compressedResponse = new Response(compressedStream);
    const buffer = await compressedResponse.arrayBuffer();

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Make URL-safe by replacing +/= with -/_/nothing
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Decompresses a base64url-encoded string back to a parsed JSON object.
   * This is the inverse of `compressToBase64Url`.
   */
  async decompressFromBase64Url(base64url: string): Promise<any> {
    // Revert URL-safe characters
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
    const decompressedResponse = new Response(decompressedStream);
    const jsonString = await decompressedResponse.text();

    return JSON.parse(jsonString);
  }

  /**
   * Triggers a browser file download of the report as a formatted JSON file.
   *
   * Why not use a download library: The built-in Blob + URL.createObjectURL approach
   * works in all modern browsers and avoids an extra dependency for a single operation.
   */
  downloadAsJsonFile(reportData: object, filename?: string): void {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `cortex-benchmark-results-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Reads and parses a JSON file selected via a file input.
   * Returns a Promise that resolves with the parsed data or rejects on error.
   */
  parseUploadedFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
