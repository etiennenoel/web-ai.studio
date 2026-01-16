export interface LanguagePack {
    code: string;
    label: string;
    status: 'ready' | 'downloading' | 'not-cached';
    progress?: number;
}
