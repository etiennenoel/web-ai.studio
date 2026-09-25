import { WindowMessageType } from '../enums/window-message-type.enum';
import { ApiCallPayload } from './api-call-payload.interface';
import { HardwareInformation } from '../../base/src/lib/interfaces/hardware-info.interface';
import { ChromeAiApiName } from '../enums/chrome-ai-api-name.enum';
import { ClassifierRuntimeOp } from '../../base/src/lib/classifier/enums/classifier-runtime-op.enum';
import { ClassifierRuntimeResponse } from '../../base/src/lib/classifier/interfaces/classifier-runtime-response.interface';

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

/** Fields shared by all window messages that expect a correlated response. */
interface CorrelatedMessage {
  messageId: string;
}

// ---------------------------------------------------------------------------
// API Call (one-way, no response)
// ---------------------------------------------------------------------------

export interface ApiCallWindowMessage {
  type: WindowMessageType.API_CALL;
  payload: ApiCallPayload;
}

// ---------------------------------------------------------------------------
// Hardware Info
// ---------------------------------------------------------------------------

export interface HwInfoRequestMessage extends CorrelatedMessage {
  type: WindowMessageType.HW_INFO_REQUEST;
}

export interface HwInfoResponseMessage extends CorrelatedMessage {
  type: WindowMessageType.HW_INFO_RESPONSE;
  data?: HardwareInformation;
  error?: string;
}

// ---------------------------------------------------------------------------
// Diagnosis Eval
// ---------------------------------------------------------------------------

/** Result of checking which Chrome AI APIs exist on window. */
export type DiagnosisEvalResult = Record<ChromeAiApiName, boolean>;

export interface DiagnosisEvalRequestMessage extends CorrelatedMessage {
  type: WindowMessageType.DIAGNOSIS_EVAL_REQUEST;
}

export interface DiagnosisEvalResponseMessage extends CorrelatedMessage {
  type: WindowMessageType.DIAGNOSIS_EVAL_RESPONSE;
  data: DiagnosisEvalResult;
}

// ---------------------------------------------------------------------------
// Get History
// ---------------------------------------------------------------------------

export interface GetHistoryRequestPayload {
  apiName: string;
  origin: string;
}

export interface GetHistoryRequestMessage extends CorrelatedMessage {
  type: WindowMessageType.GET_HISTORY_REQUEST;
  payload: GetHistoryRequestPayload;
}

export interface GetHistoryResponseMessage extends CorrelatedMessage {
  type: WindowMessageType.GET_HISTORY_RESPONSE;
  data?: unknown[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export interface RoutingResponseData {
  modelRouting: string;
}

export interface RoutingRequestMessage extends CorrelatedMessage {
  type: WindowMessageType.ROUTING_REQUEST;
}

export interface RoutingResponseMessage extends CorrelatedMessage {
  type: WindowMessageType.ROUTING_RESPONSE;
  data: RoutingResponseData;
}

// ---------------------------------------------------------------------------
// Provider (Gemini/OpenAI) Request
// ---------------------------------------------------------------------------

export interface ProviderRequestPayload {
  api: string;
  method: string;
  args: unknown;
}

export interface ProviderRequestMessage extends CorrelatedMessage {
  type: WindowMessageType.PROVIDER_REQUEST;
  payload: ProviderRequestPayload;
}

export interface ProviderResponseMessage extends CorrelatedMessage {
  type: WindowMessageType.PROVIDER_RESPONSE;
  data?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Classifier polyfill
// ---------------------------------------------------------------------------

export interface ClassifierRequestMessage extends CorrelatedMessage {
  type: WindowMessageType.CLASSIFIER_REQUEST;
  op: ClassifierRuntimeOp;
  /** Correlates progress and aborts across the whole request chain. */
  requestId: string;
  payload?: unknown;
}

export interface ClassifierResponseMessage extends CorrelatedMessage {
  type: WindowMessageType.CLASSIFIER_RESPONSE;
  data: ClassifierRuntimeResponse;
}

export interface ClassifierProgressWindowMessage {
  type: WindowMessageType.CLASSIFIER_PROGRESS;
  requestId: string;
  loaded: number;
}

// ---------------------------------------------------------------------------
// Settings push
// ---------------------------------------------------------------------------

export interface SettingsPushData {
  wrapApi: boolean;
  classifierPolyfill: boolean;
}

export interface SettingsPushMessage {
  type: WindowMessageType.SETTINGS_PUSH;
  data: SettingsPushData;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/**
 * Union of all possible window messages exchanged between the injected script
 * and the content script. Use the `type` field as the discriminant.
 */
export type WindowMessage =
  | ApiCallWindowMessage
  | HwInfoRequestMessage
  | HwInfoResponseMessage
  | DiagnosisEvalRequestMessage
  | DiagnosisEvalResponseMessage
  | GetHistoryRequestMessage
  | GetHistoryResponseMessage
  | RoutingRequestMessage
  | RoutingResponseMessage
  | ProviderRequestMessage
  | ProviderResponseMessage
  | ClassifierRequestMessage
  | ClassifierResponseMessage
  | ClassifierProgressWindowMessage
  | SettingsPushMessage;
