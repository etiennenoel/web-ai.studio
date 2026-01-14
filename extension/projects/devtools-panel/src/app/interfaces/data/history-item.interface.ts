export interface HistoryItem {
    id: string;
    timestamp: string;
    prompt: string;
    systemPrompt?: string;
    response: string;
    tokens: number;
    latency: string;
    status: 'success' | 'error';
    params: {
        temperature?: number;
        topK?: number;
    };
}
