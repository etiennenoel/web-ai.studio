import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import {ModelManager} from "base";

@Component({
  selector: 'app-model-download-card',
  standalone: false,
  templateUrl: './model-download-card.html',
  styleUrl: './model-download-card.scss',
})
export class ModelDownloadCard implements OnInit {
  progress: WritableSignal<number> = signal(0);
  status: WritableSignal<'unknown' | 'downloadable' | 'downloading' | 'available' | 'error'> = signal('unknown');

  constructor(private readonly modelManager: ModelManager) {}

  ngOnInit(): void {
    this.refreshStatus();
  }

  async refreshStatus() {
    const availability = await this.modelManager.availability();
    this.status.set(availability);
  }

  async onDownloadClick() {
    const self = this;
    this.status.set('downloading');
    this.progress.set(0)
    await this.modelManager.download((progress: number) => {
      self.progress.set(progress);
    });

    this.status.set('available');
    this.refreshStatus();
  }
}
