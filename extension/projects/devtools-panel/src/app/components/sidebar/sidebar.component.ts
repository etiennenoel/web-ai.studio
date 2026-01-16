import { Component } from '@angular/core';
import { PanelTab } from '../../enums/panel-tab.enum';
import { MenuItemConfig } from '../../interfaces/menu-item-config.interface';
import { APP_VERSION } from 'base';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent {
  appVersion = APP_VERSION;
  readonly menuItems: MenuItemConfig[] = [
    { id: PanelTab.OVERVIEW, label: 'Overview', iconClass: 'fa-solid fa-gauge-high', isApi: false, isManagement: false },
    { id: PanelTab.MODELS, label: 'Models', iconClass: 'fa-solid fa-layer-group', isApi: false, isManagement: true },
    { id: PanelTab.PROMPT, label: 'Prompt API', iconClass: 'fa-solid fa-terminal', isApi: true, isManagement: false },
    { id: PanelTab.SUMMARIZER, label: 'Summarizer API', iconClass: 'fa-regular fa-file-lines', isApi: true, isManagement: false },
    { id: PanelTab.TRANSLATOR, label: 'Translator API', iconClass: 'fa-solid fa-language', isApi: true, isManagement: false },
    { id: PanelTab.DETECTOR, label: 'Language Detector', iconClass: 'fa-solid fa-magnifying-glass', isApi: true, isManagement: false },
    { id: PanelTab.PROOFREADER, label: 'Proofreader API', iconClass: 'fa-solid fa-check-double', isApi: true, isManagement: false },
    { id: PanelTab.WRITER, label: 'Writer API', iconClass: 'fa-solid fa-pen-nib', isApi: true, isManagement: false },
    { id: PanelTab.REWRITER, label: 'Rewriter API', iconClass: 'fa-solid fa-wand-magic-sparkles', isApi: true, isManagement: false },
  ];

  get apiItems() { return this.menuItems.filter(item => item.isApi); }
  get managementItems() { return this.menuItems.filter(item => item.isManagement); }
  get nonApiItems() { return this.menuItems.filter(item => !item.isApi && !item.isManagement); }
}
