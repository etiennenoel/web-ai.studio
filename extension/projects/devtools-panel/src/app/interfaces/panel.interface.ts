import { PanelTab } from '../enums/panel-tab.enum';

/**
 * @interface PanelInterface
 * @description Interface for the panel services.
 */
export interface PanelInterface {
    getPanelId(): PanelTab;
    getHtmlTemplateFilePath(): string;
    render(): void;
}
