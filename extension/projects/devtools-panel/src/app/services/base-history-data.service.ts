import { HistoryItem } from '../interfaces/data/history-item.interface';

export abstract class BaseHistoryDataService {
    abstract getHistory(): Promise<HistoryItem[]>;
}
