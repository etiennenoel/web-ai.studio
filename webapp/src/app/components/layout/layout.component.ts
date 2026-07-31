import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {SidebarService} from '../../core/services/sidebar.service';

@Component({
  selector: 'magieno-webai-studio-layout',
  standalone: false,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {

  isSidebarOpen = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private readonly sidebarService: SidebarService,
    private readonly router: Router,
  ) {
  }

  ngOnInit() {
    this.subscriptions.push(
      this.sidebarService.isOpen$.subscribe(isOpen => this.isSidebarOpen = isOpen),
    );

    // Navigating from the drawer should dismiss it.
    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
      ).subscribe(() => this.sidebarService.close()),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  @HostListener('document:keydown.escape')
  closeSidebar() {
    this.sidebarService.close();
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }
}
