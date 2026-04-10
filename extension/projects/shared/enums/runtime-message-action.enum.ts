/**
 * Action strings for chrome.runtime.sendMessage communication between
 * the content script / devtools panel / side panel and the service worker.
 *
 * Each action maps to a specific handler in the service worker that
 * performs the requested operation (usually involving IndexedDB or chrome.system APIs).
 */
export enum RuntimeMessageAction {
  /** Save an API call record to IndexedDB. */
  LOG_API_CALL = 'log_api_call',

  /** Retrieve all API call history records, sorted by timestamp descending. */
  GET_ALL_HISTORY = 'get_all_history',

  /** Retrieve a single API call record by its ID. */
  GET_HISTORY_ITEM = 'get_history_item',

  /** Retrieve API call history filtered by origin and optionally API name. */
  GET_API_HISTORY = 'get_api_history',

  /** Clear all API call history for a specific origin. */
  CLEAR_API_HISTORY = 'clear_api_history',

  /** Clear all API call history across all origins. */
  CLEAR_ALL_HISTORY = 'clear_all_history',

  /** Delete all API calls belonging to a specific session. */
  DELETE_API_SESSION = 'delete_api_session',

  /** Retrieve hardware information via chrome.system.cpu and chrome.system.memory. */
  GET_HARDWARE_INFO = 'getHardwareInformation',

  /** Retrieve a setting value from IndexedDB. */
  GET_SETTING = 'get_setting',

  /** Persist a setting value to IndexedDB. */
  SET_SETTING = 'set_setting',

  /** Trigger API availability diagnosis (sent from devtools panel to content script). */
  DIAGNOSE_APIS = 'diagnose_apis',
}
