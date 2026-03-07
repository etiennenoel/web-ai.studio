import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing.page.html',
  standalone: false
})
export class LandingPageComponent {
  constructor(private router: Router) {}

  openPage(path: string) {
    this.router.navigate([path]);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
