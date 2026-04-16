import { RuntimeMessageAction } from '../enums/runtime-message-action.enum';
import { ApiCallPayload } from './api-call-payload.interface';

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

interface RuntimeMessageBase {
  action: RuntimeMessageAction;
}

// ---------------------------------------------------------------------------
// API Call Logging
// ---------------------------------------------------------------------------

export interface LogApiCallMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.LOG_API_CALL;
  payload: ApiCallPayload;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface GetAllHistoryMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.GET_ALL_HISTORY;
}

export interface GetHistoryItemMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.GET_HISTORY_ITEM;
  payload: { id: string };
}

export interface GetApiHistoryMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.GET_API_HISTORY;
  payload: { origin: string; apiName: string };
}

export interface ClearApiHistoryMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.CLEAR_API_HISTORY;
  payload: { origin: string };
}

export interface ClearAllHistoryMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.CLEAR_ALL_HISTORY;
}

export interface DeleteApiSessionMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.DELETE_API_SESSION;
  payload: { origin: string; sessionId: string };
}

// ---------------------------------------------------------------------------
// Hardware Info
// ---------------------------------------------------------------------------

export interface GetHardwareInfoMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.GET_HARDWARE_INFO;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface GetSettingMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.GET_SETTING;
  key: string;
  defaultValue: unknown;
}

export interface SetSettingMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.SET_SETTING;
  key: string;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

export interface DiagnoseApisMessage extends RuntimeMessageBase {
  action: RuntimeMessageAction.DIAGNOSE_APIS;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/**
 * Union of all possible chrome.runtime messages exchanged between
 * the content script / devtools panel / side panel and the service worker.
 * Use the `action` field as the discriminant.
 */
export type RuntimeMessage =
  | LogApiCallMessage
  | GetAllHistoryMessage
  | GetHistoryItemMessage
  | GetApiHistoryMessage
  | ClearApiHistoryMessage
  | ClearAllHistoryMessage
  | DeleteApiSessionMessage
  | GetHardwareInfoMessage
  | GetSettingMessage
  | SetSettingMessage
  | DiagnoseApisMessage;
