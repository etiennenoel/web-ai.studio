export class AudioTestUtils {
  static async fetchAudio(url: string): Promise<{blob: Blob, dataUrl: string}> {
    const response = await fetch(url);
    const blob = await response.blob();
    return {
      blob,
      dataUrl: url
    };
  }
}
