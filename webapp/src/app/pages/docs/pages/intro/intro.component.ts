import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-docs-intro',
  templateUrl: './intro.component.html',
  standalone: false
})
export class DocsIntroComponent {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
