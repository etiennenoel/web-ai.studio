export interface ApiAvailability {
    id: string;
    name: string;
    description: string;
    status: 'available' | 'readily' | 'downloading' | 'downloadable' | 'after-download' | 'unavailable' | 'unknown' | 'error';
    error?: string;
    icon: string; // FontAwesome class
    panelTabId: string;
}