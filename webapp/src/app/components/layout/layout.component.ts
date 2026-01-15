import { Component } from '@angular/core';
import { DesignService } from '../../core/services/design.service';

@Component({
  selector: 'magieno-webai-studio-layout',
  standalone: false,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  constructor(public designService: DesignService) {}
}
