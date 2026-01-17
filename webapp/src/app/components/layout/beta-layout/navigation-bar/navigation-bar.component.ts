import { Component, EventEmitter, Input, Output } from '@angular/core';
import {ThemeManager} from '../../../../core/services/theme.manager';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  standalone: false
})
export class NavigationBarComponent {
  @Input() activePage: string = 'home';

  constructor(
    private themeManager: ThemeManager,
  ) {
  }

  onToggleTheme() {
    this.themeManager.toggleTheme();
  }
}
