export interface RecentActivity {
    id: string;
    description: string;
    timestamp: string;
    apiIcon: string;
    status: 'success' | 'error';
}
