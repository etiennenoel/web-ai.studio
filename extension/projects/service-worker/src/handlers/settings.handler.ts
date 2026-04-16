import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { RuntimeMessage, GetSettingMessage, SetSettingMessage } from '../../../shared/interfaces/runtime-messages.interface';
import { WebAIDatabase } from '../db';
import { RuntimeMessageHandler } from './runtime-message-handler.interface';

/**
 * Handles GET_SETTING and SET_SETTING messages by reading from
 * and writing to the settings object store in IndexedDB.
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
        return { success: true };
      }

      default:
        return { error: `SettingsHandler: Unhandled action ${request.action}` };
    }
  }
}
