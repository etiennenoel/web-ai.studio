import { ApiStatus } from '../enums/api-status.enum';

export interface ApiCheck {
    titleHtml: string;
    success: boolean;
}

export interface ApiStatusResult {
    status: ApiStatus;
    message: string;
    checks: ApiCheck[];
    errorHtml?: string;
}
