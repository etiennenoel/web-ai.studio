import { Component, EventEmitter, Input, Output } from '@angular/core';
import {ThemeManager} from '../../../../core/services/theme.manager';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  standalone: false
})
export class NavigationBarComponent {
  @Input() activePage: string = 'home';
  @Output() navigate = new EventEmitter<string>();
  @Output() openPage = new EventEmitter<string>();

  constructor(
    private themeManager: ThemeManager,
  ) {
  }

  onNavigate(page: string) {
    this.navigate.emit(page);
  }

  onOpenPage(page: string) {
    this.openPage.emit(page);
  }

  onToggleTheme() {
    this.themeManager.toggleTheme();
  }
}
