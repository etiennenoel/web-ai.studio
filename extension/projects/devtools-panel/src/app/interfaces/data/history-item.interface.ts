export interface HistoryItem {
    id: string;
    timestamp: string;
    prompt: string;
    systemPrompt?: string;
    response: string;
    tokens: number;
    characters?: number;
    inputTokens?: number;
    inputLength?: number;
    latency: string;
    status: 'success' | 'error';
    params: {
        [key: string]: any;
    };
}
