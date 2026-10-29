import { WindowMessageType } from '../../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../../shared/enums/runtime-message-action.enum';
import { ApiCallStage } from '../../../shared/enums/api-call-stage.enum';
import { ApiCallWindowMessage } from '../../../shared/interfaces/window-messages.interface';
import { WindowMessageHandler } from './window-message-handler.interface';
import { ApiCallRecord } from '../../../shared/interfaces/api-call-record.interface';

declare const chrome: any;

function resolveRecordStage(record: ApiCallRecord, incomingStage?: ApiCallStage): ApiCallStage | undefined {
  if (record.timestamps[ApiCallStage.ERROR] !== undefined || record.errorMessage) {
    return ApiCallStage.ERROR;
  }
  if (record.timestamps[ApiCallStage.COMPLETED] !== undefined) {
    return ApiCallStage.COMPLETED;
  }
  if (record.timestamps[ApiCallStage.FIRST_TOKEN] !== undefined) {
    return ApiCallStage.FIRST_TOKEN;
  }
  if (record.timestamps[ApiCallStage.EXECUTE] !== undefined) {
    return ApiCallStage.EXECUTE;
  }
  if (record.timestamps[ApiCallStage.CREATE] !== undefined) {
    return ApiCallStage.CREATE;
  }
  return incomingStage;
}

/**
 * Handles WEBAI_API_CALL messages by forwarding the API call payload
 * to the service worker for persistence in IndexedDB.
 * 
 * It also maintains an in-memory cache of the current page's calls
 * for the side panel's active session view.
 */
export class ApiCallForwardHandler implements WindowMessageHandler {
  readonly handledType = WindowMessageType.API_CALL;

  private static currentPageCalls = new Map<string, ApiCallRecord>();

  /**
   * Returns all API calls captured in the current page session.
   */
  public static getCurrentPageCalls(): ApiCallRecord[] {
    const records = Array.from(this.currentPageCalls.values());
    // Sort by timestamp descending
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clears the in-memory API calls captured for the current page session.
   */
  public static clearCurrentPageCalls(): void {
    this.currentPageCalls.clear();
  }

  handle(message: ApiCallWindowMessage): void {
    const data = message.payload;
    
    // Update in-memory record for the current page session
    let record = ApiCallForwardHandler.currentPageCalls.get(data.id);
    if (!record) {
      record = {
        id: data.id,
        sessionId: data.sessionId || data.id,
        api: data.api,
        method: data.method,
        origin: data.origin,
        timestamp: data.timestamp,
        timestamps: {},
      };
      ApiCallForwardHandler.currentPageCalls.set(data.id, record);
    }

    if (data.stage) {
      record.timestamps[data.stage] = data.timestamp;
    }

    if (data.errorMessage !== undefined) record.errorMessage = data.errorMessage;
    if (data.options !== undefined) record.options = data.options;
    if (data.args !== undefined) record.args = data.args;
    if (data.response !== undefined) record.response = data.response;
    if (data.inputTokenCount !== undefined) record.inputTokenCount = data.inputTokenCount;
    if (data.inputLength !== undefined) record.inputLength = data.inputLength;

    record.stage = resolveRecordStage(record, data.stage);

    // Forward to service worker for persistence
    chrome.runtime.sendMessage(
      { action: RuntimeMessageAction.LOG_API_CALL, payload: message.payload },
      () => {
        if (chrome.runtime.lastError) {
          // Intentionally ignored
        }
      },
    );
  }
}
