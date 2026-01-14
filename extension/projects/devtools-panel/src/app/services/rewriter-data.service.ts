import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class RewriterDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'rewrite_1', timestamp: '14:30:12', prompt: 'Make this text more formal: "Hey wats up"',
            response: 'Greetings, how are you doing?', tokens: 10, latency: '50ms', status: 'success', params: { temperature: 0.3 }
        }
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }
}
