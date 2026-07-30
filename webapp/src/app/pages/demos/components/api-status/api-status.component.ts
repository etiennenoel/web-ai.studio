import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ApiStatusPill {
  name: string;
  status: string;
}

/**
 * Generic availability header for demos composing multiple Built-In AI APIs:
 * one status pill per API, an optional install button for on-device speech
 * models, and a hint banner when something is unavailable.
 */
@Component({
  selector: 'app-api-status',
  templateUrl: './api-status.component.html',
  standalone: false
})
export class ApiStatusComponent {
  @Input() apis: ApiStatusPill[] = [];
  @Input() showInstall = false;
  @Input() isInstalling = false;
  @Input() isDownloading = false;
  @Input() downloadProgress = 0;
  @Input() unavailableHint = '';
  @Output() install = new EventEmitter<void>();

  get hasUnavailable(): boolean {
    return this.apis.some(api => api.status === 'unavailable');
  }

  get hasDownloadable(): boolean {
    return this.apis.some(api => api.status === 'downloadable');
  }
}
