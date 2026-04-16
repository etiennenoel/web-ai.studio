import { Component } from '@angular/core';
import { AppUpdateService } from './core/services/app-update.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  standalone: false
})
export class AppComponent {
  constructor(private appUpdateService: AppUpdateService) {
    this.appUpdateService.init();
  }
}
