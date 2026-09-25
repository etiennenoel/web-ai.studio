/** `target` value that routes a chrome.runtime message to the offscreen document. */
export const CLASSIFIER_RUNTIME_TARGET = 'webai-classifier-offscreen';

/** `action` of requests handled by the offscreen document. */
export const CLASSIFIER_REQUEST_ACTION = 'classifier_request';

/** `action` of progress notifications emitted by the offscreen document. */
export const CLASSIFIER_PROGRESS_ACTION = 'classifier_progress';

/** `action` the service worker handles to create the offscreen document. */
export const ENSURE_OFFSCREEN_ACTION = 'ensure_offscreen';
