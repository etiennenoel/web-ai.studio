import { PanelTab } from '../enums/panel-tab.enum';

/**
 * @interface MenuItemConfig
 * @description Interface for the configuration of a sidebar menu item.
 */
export interface MenuItemConfig {
    id: PanelTab;
    label: string;
    iconClass: string;
    isApi: boolean;
    isManagement: boolean;
}
