import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DesignService } from '../../core/services/design.service';

@Component({
  selector: 'magieno-webai-studio-layout',
  standalone: false,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  constructor(public designService: DesignService, private router: Router) {}

  get isHomePage(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/';
  }

  get isDocsPage(): boolean {
    return this.router.url.startsWith('/docs');
  }
}
