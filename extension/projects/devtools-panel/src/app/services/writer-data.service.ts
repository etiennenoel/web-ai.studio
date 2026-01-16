import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class WriterDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'write_1', timestamp: '14:24:12', prompt: 'Write a JavaScript function to filter even numbers.',
            response: 'function filterEvens(arr) { return arr.filter(n => n % 2 === 0); }', tokens: 120, latency: '340ms', status: 'success', params: { temperature: 0.2, topK: 1 }
        }
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }
}
