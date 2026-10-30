import { WindowMessageType } from '../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../shared/enums/runtime-message-action.enum';
import { WindowMessageDispatcher } from './window-message-dispatcher';
import { ApiCallForwardHandler } from './handlers/api-call-forward.handler';
import { DiagnosisEvalMeta, SettingsPushData } from '../../shared/interfaces/window-messages.interface';
import { ClassifierSettingsKey } from '../../base/src/lib/classifier/enums/classifier-settings-key.enum';

declare const chrome: any;

function isTopFrame(): boolean {
  try {
    return typeof window !== 'undefined' && window.self === window.top;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. Set up the window message dispatcher FIRST (capture phase)
//
// Registered before settings push and before `injected.js` runs (per manifest
// ordering) in capture phase (`true`) so early `document_start` API calls can
// never be missed or suppressed by page `stopImmediatePropagation()` handlers.
// ---------------------------------------------------------------------------

const dispatcher = new WindowMessageDispatcher();
let latestPageMeta: DiagnosisEvalMeta | null = null;
let latestWrapApiEnabled = true;

window.addEventListener(
  'message',
  (event) => {
    dispatcher.dispatch(event);
  },
  true,
);

// Notify the service worker when a top-level document starts navigating so
// stale tab-level session records and toolbar sparkle icons from the previous
// document are cleared immediately.
if (isTopFrame()) {
  try {
    chrome.runtime.sendMessage({ action: RuntimeMessageAction.PAGE_NAVIGATION_START }, () => {
      if (chrome.runtime?.lastError) {
        // Ignore if service worker is not ready yet
      }
    });
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// 2. Push extension settings into the MAIN world (`injected.js`)
// ---------------------------------------------------------------------------

function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { action: RuntimeMessageAction.GET_SETTING, key, defaultValue },
        (response: any) => {
          if (chrome.runtime?.lastError || !response || response.value === undefined) {
            resolve(defaultValue);
          } else {
            resolve(response.value as T);
          }
        },
      );
    } catch {
      resolve(defaultValue);
    }
  });
}

async function pushSettings(): Promise<void> {
  const [wrapApi, classifierPolyfill, activeProviderId] = await Promise.all([
    getSetting<boolean>('wrap_api', true),
    getSetting<boolean>(ClassifierSettingsKey.POLYFILL_ENABLED, true),
    getSetting<string>('activeProviderId', 'chrome'),
  ]);
  latestWrapApiEnabled = wrapApi !== false;
  const data: SettingsPushData = {
    wrapApi: latestWrapApiEnabled,
    classifierPolyfill: classifierPolyfill !== false,
    activeProviderId: activeProviderId || 'chrome',
  };
  window.postMessage({ type: WindowMessageType.SETTINGS_PUSH, data }, '*');
}

let settingsPushPromise: Promise<void> = pushSettings();

function queryPageDiagnosis(): Promise<{ data: unknown; meta?: DiagnosisEvalMeta }> {
  return new Promise((resolve) => {
    const messageId = 'webai-diag-' + Date.now() + '-' + Math.random();
    let settled = false;

    const listener = (event: any) => {
      if (event.source !== window) return;
      if (
        event.data &&
        event.data.type === WindowMessageType.DIAGNOSIS_EVAL_RESPONSE &&
        event.data.messageId === messageId
      ) {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', listener, true);
        if (event.data.meta) {
          latestPageMeta = event.data.meta as DiagnosisEvalMeta;
        }
        resolve(
          event.data.meta
            ? { data: event.data.data, meta: event.data.meta }
            : { data: event.data.data },
        );
      }
    };

    window.addEventListener('message', listener, true);
    window.postMessage(
      {
        type: WindowMessageType.DIAGNOSIS_EVAL_REQUEST,
        messageId,
      },
      '*',
    );

    setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener('message', listener, true);
        resolve({ data: null });
      }
    }, 1500);
  });
}

// ---------------------------------------------------------------------------
// 3. Handle requests from the side panel, devtools, or service worker
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  // Return current frame sessions from memory
  if (request.action === RuntimeMessageAction.GET_PAGE_SESSIONS) {
    const calls = ApiCallForwardHandler.getCurrentPageCalls();
    if (request.includeMeta) {
      sendResponse({
        data: calls,
        meta: {
          wrappingActive: latestPageMeta?.wrappingActive ?? latestWrapApiEnabled,
          hasWebWorkers: latestPageMeta?.hasWebWorkers ?? false,
          polyfilledApis: latestPageMeta?.polyfilledApis ?? [],
          isSubframe: !isTopFrame(),
        },
      });
    } else {
      sendResponse({ data: calls });
    }
    return false;
  }

  // Clear current frame sessions from memory
  if (request.action === RuntimeMessageAction.CLEAR_PAGE_SESSIONS) {
    ApiCallForwardHandler.clearCurrentPageCalls();
    sendResponse({ success: true });
    return false;
  }

  // Re-push this frame's in-memory records to the service worker tab session store
  if (request.action === RuntimeMessageAction.SYNC_FRAME_SESSIONS) {
    const calls = ApiCallForwardHandler.getCurrentPageCalls();
    if (calls.length > 0) {
      try {
        chrome.runtime.sendMessage(
          { action: RuntimeMessageAction.SYNC_TAB_SESSIONS, records: calls },
          () => {
            if (chrome.runtime?.lastError) {
              // Ignore
            }
          },
        );
      } catch {
        // Ignore
      }
    }
    sendResponse({ success: true });
    return false;
  }

  // Re-push updated settings into the MAIN world when toggled in Settings UI
  if (request.action === RuntimeMessageAction.SETTINGS_UPDATED) {
    settingsPushPromise = pushSettings();
    settingsPushPromise.then(() => sendResponse({ success: true }));
    return true;
  }

  // Classifier download progress relayed by the service worker is consumed by
  // ClassifierRuntimeClient's own listener; nothing to do here.
  if (request.action === RuntimeMessageAction.CLASSIFIER_PROGRESS) {
    return false;
  }

  if (request.action === RuntimeMessageAction.DIAGNOSE_APIS) {
    // Wait briefly for initial settings push so disabled polyfills are already rolled back
    Promise.race([settingsPushPromise, new Promise((r) => setTimeout(r, 150))])
      .then(() => queryPageDiagnosis())
      .then((result) => sendResponse(result));
    return true;
  }

  return false;
});
