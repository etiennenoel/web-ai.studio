import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class SummarizerDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'sum_1', timestamp: '14:23:05', prompt: 'Summarize this article about Quantum Computing.',
            response: 'Quantum computing is a rapidly-emerging technology...', tokens: 45, latency: '120ms', status: 'success', params: { temperature: 0.7, topK: 3 }
        }
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }
}
