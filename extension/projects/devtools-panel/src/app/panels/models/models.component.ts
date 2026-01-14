import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AiModelDataService } from '../../services/ai-model-data.service';
import { AiModel } from '../../interfaces/data/ai-model.interface';
import { ToastService } from 'base';

@Component({
  selector: 'app-models',
  templateUrl: './models.component.html',
  styleUrls: ['./models.component.scss'],
  standalone: false
})
export class ModelsComponent implements OnInit {
  models: AiModel[] = [];

  constructor(
    private aiModelDataService: AiModelDataService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadModels();
  }

  async loadModels() {
    this.models = await this.aiModelDataService.getModels();
    this.cdr.detectChanges();
  }

  deleteModel(name: string) {
    this.toastService.show(`Deleted ${name}`, 'success');
    // TODO: Implement actual deletion
  }

  downloadModel(name: string) {
    this.toastService.show(`Downloading ${name}...`, 'success');
    // TODO: Implement actual download
  }
}