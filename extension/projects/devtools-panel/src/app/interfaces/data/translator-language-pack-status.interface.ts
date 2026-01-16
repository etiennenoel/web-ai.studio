import { ApiStatus } from 'base';

export interface TranslatorLanguagePackStatus {
    sourceLanguage: string;
    targetLanguage: string;
    status: ApiStatus;
    message: string;
    progress?: number;
    abortController?: AbortController;
}
