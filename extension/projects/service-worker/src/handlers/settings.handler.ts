import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage, GetSettingMessage, SetSettingMessage } from '../../../shared/interfaces/runtime-messages.interface';
import { ClassifierSettingsKey } from '../../../base/src/lib/classifier/enums/classifier-settings-key.enum';
import { WebAIDatabase } from '../db';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

declare const chrome: any;

const PAGE_SYNCED_SETTING_KEYS = new Set<string>([
  'wrap_api',
  'activeProviderId',
  ClassifierSettingsKey.POLYFILL_ENABLED,
]);

/**
 * Handles GET_SETTING and SET_SETTING messages by reading from
 * and writing to the settings object store in IndexedDB.
 *
 * Broadcasts `SETTINGS_UPDATED` to open tabs and extension views whenever
 * page-relevant settings (`wrap_api`, `activeProviderId`, `classifier_polyfill`) change.
 */
export class SettingsHandler implements RuntimeMessageHandler {
  readonly handledActions = [
    RuntimeMessageAction.GET_SETTING,
    RuntimeMessageAction.SET_SETTING,
  ];

  constructor(private readonly database: WebAIDatabase) {}

  async handle(request: RuntimeMessage, _sender: any): Promise<unknown> {
    switch (request.action) {
      case RuntimeMessageAction.GET_SETTING: {
        const msg = request as GetSettingMessage;
        const value = await this.database.getSetting(msg.key, msg.defaultValue);
        return { value };
      }

      case RuntimeMessageAction.SET_SETTING: {
        const msg = request as SetSettingMessage;
        await this.database.setSetting(msg.key, msg.value);
        if (PAGE_SYNCED_SETTING_KEYS.has(msg.key)) {
          this.broadcastSettingsUpdated(msg.key, msg.value);
        }
        return { success: true };
      }

      default:
        return { error: `SettingsHandler: Unhandled action ${request.action}` };
    }
  }

  private broadcastSettingsUpdated(key: string, value: unknown): void {
    if (typeof chrome === 'undefined') return;

    // Notify open tabs (all frames) so content scripts re-push WEBAI_SETTINGS_PUSH
    if (chrome.tabs?.query && chrome.tabs?.sendMessage) {
      try {
        chrome.tabs.query({}, (tabs: any[]) => {
          if (chrome.runtime?.lastError || !Array.isArray(tabs)) return;
          for (const tab of tabs) {
            if (typeof tab?.id !== 'number') continue;
            chrome.tabs.sendMessage(
              tab.id,
              { action: RuntimeMessageAction.SETTINGS_UPDATED, key, value },
              () => {
                void chrome.runtime?.lastError;
              },
            );
          }
        });
      } catch {
        // Ignore
      }
    }

    // Notify open extension views (Side Panel, DevTools)
    if (chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage(
          { action: RuntimeMessageAction.SETTINGS_UPDATED, key, value },
          () => {
            void chrome.runtime?.lastError;
          },
        );
      } catch {
        // Ignore
      }
    }
  }
}
