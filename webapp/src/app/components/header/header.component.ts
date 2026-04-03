import {Component, Inject, Input, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {Dialog} from '@angular/cdk/dialog';
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
    protected readonly dialog: Dialog
  ) {
  }

  async ngOnInit() {

  }

  openSidebar() {
    this.dialog.open(SidebarComponent, { 
      panelClass: ['w-64', 'h-full', 'fixed', 'left-0', 'top-0', 'bg-white', 'shadow-2xl', 'dark:bg-[#121212]'],
      hasBackdrop: true,
      backdropClass: 'bg-black/50'
    });
  }

}
