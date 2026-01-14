import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class DetectorDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'detect_1', timestamp: '14:40:05', prompt: 'Detect language: "Bonjour"',
            response: '[{ detectedLanguage: "fr", confidence: 0.99 }]', tokens: 5, latency: '20ms', status: 'success', params: { temperature: 0 }
        }
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }
}
