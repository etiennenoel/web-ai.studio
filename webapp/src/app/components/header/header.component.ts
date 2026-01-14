import {Component, Inject, Input, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {SidebarComponent} from '../sidebar/sidebar.component';

@Component({
  selector: 'webai-studio-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    protected readonly ngbOffcanvas: NgbOffcanvas
  ) {
  }

  async ngOnInit() {

  }

  openSidebar() {
    this.ngbOffcanvas.open(SidebarComponent, { panelClass: 'w-auto' })
  }

}
