import { ClassifierRuntimeOp } from '../enums/classifier-runtime-op.enum';

/** A chrome.runtime message addressed to the offscreen classifier runtime. */
export interface ClassifierRuntimeRequest {
  action: string;
  target: string;
  op: ClassifierRuntimeOp;
  /** Correlates progress notifications and aborts with this request. */
  requestId: string;
  /** Tab that originated the request, when it came from a content script. */
  clientTabId?: number;
  payload?: unknown;
}
