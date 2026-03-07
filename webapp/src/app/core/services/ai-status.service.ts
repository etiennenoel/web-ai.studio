import { Injectable } from '@angular/core';

export interface AiStatus {
  api: string;
  status: 'readily' | 'after-download' | 'no' | 'checking';
  details?: string;
  downloadProgress?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiStatusService {
  
  async checkStatus(apiName: string): Promise<AiStatus> {
    const ai = (self as any).ai;
    if (!ai) {
      return { api: apiName, status: 'no', details: 'self.ai not found' };
    }

    let api: any;
    switch (apiName) {
      case 'languageModel': api = ai.languageModel; break;
      case 'summarizer': api = ai.summarizer; break;
      case 'writer': api = ai.writer; break;
      case 'rewriter': api = ai.rewriter; break;
      case 'proofreader': api = ai.proofreader; break;
      default: return { api: apiName, status: 'no', details: 'Unknown API' };
    }

    if (!api) {
        return { api: apiName, status: 'no', details: 'API not exposed in self.ai' };
    }

    try {
      const capabilities = await api.capabilities();
      return { api: apiName, status: capabilities.available };
    } catch (e) {
      return { api: apiName, status: 'no', details: (e as Error).message };
    }
  }

  async downloadModel(apiName: string, progressCallback: (loaded: number, total: number) => void): Promise<void> {
    const ai = (self as any).ai;
    if (!ai) throw new Error('AI not available');

    let api: any;
    switch (apiName) {
      case 'languageModel': api = ai.languageModel; break;
      case 'summarizer': api = ai.summarizer; break;
      case 'writer': api = ai.writer; break;
      case 'rewriter': api = ai.rewriter; break;
      case 'proofreader': api = ai.proofreader; break;
      default: throw new Error('Unknown API');
    }

    if (!api) throw new Error('API not available');

    const session = await api.create({
      monitor: (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          progressCallback(e.loaded, e.total);
        });
      }
    });
    
    // Immediately destroy as we only wanted to trigger download/check
    session.destroy();
  }
}
