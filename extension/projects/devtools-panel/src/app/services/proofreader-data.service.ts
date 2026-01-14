import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class ProofreaderDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'proof_1', timestamp: '14:35:22', prompt: 'I has a cat.',
            response: 'I have a cat.', tokens: 5, latency: '30ms', status: 'success', params: { temperature: 0.1 }
        }
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }
}
