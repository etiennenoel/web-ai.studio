export interface AiModel {
    name: string;
    status: 'available' | 'downloading' | 'downloadable';
    progress?: number;
}
