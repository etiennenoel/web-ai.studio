import { WindowMessageType } from '../enums/window-message-type.enum';
import { ApiCallPayload } from './api-call-payload.interface';
import { HardwareInformation } from '../../base/src/lib/interfaces/hardware-info.interface';
import { ChromeAiApiName } from '../enums/chrome-ai-api-name.enum';

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
  | ProviderResponseMessage;
