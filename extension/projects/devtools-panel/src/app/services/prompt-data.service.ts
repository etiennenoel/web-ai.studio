import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';

@Injectable({
  providedIn: 'root'
})
export class PromptDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'prompt_1', timestamp: '14:45:10', prompt: 'Tell me a joke.',
            response: 'Why did the chicken cross the road? To get to the other side.', tokens: 15, latency: '100ms', status: 'success', params: { temperature: 0.9 }
        }
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }

    public addHistoryItem(item: HistoryItem): Promise<void> {
        this.MOCK_HISTORY.unshift(item);
        return Promise.resolve();
    }
}
