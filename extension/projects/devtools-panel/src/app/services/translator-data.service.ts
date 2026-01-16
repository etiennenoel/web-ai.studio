import { Injectable } from '@angular/core';
import { BaseHistoryDataService } from './base-history-data.service';
import { HistoryItem } from '../interfaces/data/history-item.interface';
import { LanguagePack } from '../interfaces/data/language-pack.interface';

@Injectable({
  providedIn: 'root'
})
export class TranslatorDataService extends BaseHistoryDataService {
    private readonly MOCK_HISTORY: HistoryItem[] = [
        {
            id: 'trans_1', timestamp: '14:25:01', prompt: 'Translate "Hello world" to French.',
            response: 'Bonjour le monde', tokens: 5, latency: '12ms', status: 'success', params: { temperature: 0.5 }
        },
        {
             id: 'trans_2', timestamp: '14:26:05', prompt: 'Translate "Good morning" to Spanish.',
             response: 'Buenos días', tokens: 4, latency: '10ms', status: 'success', params: { temperature: 0.5 }
        }
    ];

    private readonly MOCK_LANGS: LanguagePack[] = [
        { code: 'en-es', label: 'English to Spanish', status: 'ready' },
        { code: 'en-fr', label: 'English to French', status: 'downloading', progress: 45 },
        { code: 'en-jp', label: 'English to Japanese', status: 'not-cached' },
        { code: 'es-en', label: 'Spanish to English', status: 'ready' },
        { code: 'de-en', label: 'German to English', status: 'not-cached' },
    ];

    public getHistory(): Promise<HistoryItem[]> {
        return Promise.resolve([...this.MOCK_HISTORY]);
    }

    public getLanguagePacks(): Promise<LanguagePack[]> {
        return Promise.resolve([...this.MOCK_LANGS]);
    }
}
