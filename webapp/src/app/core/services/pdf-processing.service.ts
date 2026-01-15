import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfProcessingService {
  async getPagesAsImageBlobs(file: Blob | File): Promise<Blob[]> {
    return []; // Stub: return empty array or mock images
  }
}
