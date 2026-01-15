import { Injectable } from '@angular/core';
import { FramingAlgorithm } from '../enums/framing-algorithm.enum';
import { OutputType } from '../enums/output-type.enum';

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {
  async frame(content: Blob | File, dimensions: { width: number, height: number }, algorithm: FramingAlgorithm, outputType: OutputType): Promise<any[]> {
    // Stub implementation: return the original content as data URL or Blob
    if (outputType === OutputType.DataUrl) {
      return [await this.blobToDataUrl(content)];
    }
    return [content];
  }

  async getImageDimensions(file: File | Blob): Promise<{ width: number, height: number }> {
    return { width: 100, height: 100 }; // Stub
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
