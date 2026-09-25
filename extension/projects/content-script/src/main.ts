import { WindowMessageType } from '../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../shared/enums/runtime-message-action.enum';
import { WindowMessageDispatcher } from './window-message-dispatcher';
import { ApiCallForwardHandler } from './handlers/api-call-forward.handler';
import { SettingsPushData } from '../../shared/interfaces/window-messages.interface';
import { ClassifierSettingsKey } from '../../base/src/lib/classifier/enums/classifier-settings-key.enum';

declare const chrome: any;

console.log('WebAI Extension Content Script injected.');

// ---------------------------------------------------------------------------
// 1. Page-context script
//
// The content script runs in an "isolated world" that shares the DOM but NOT
// the JavaScript context with the host page. `injected.js` is declared in the
// manifest as a MAIN-world content script at document_start, so API wrapping
// and the Classifier polyfill exist before the page's own scripts run and
// regardless of the page's CSP. The settings that gate both behaviors are
// pushed to it as soon as they load.
// ---------------------------------------------------------------------------

function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: RuntimeMessageAction.GET_SETTING, key, defaultValue }, (response: any) => {
      // If chrome.runtime.lastError occurs, we assume the default
      if (chrome.runtime.lastError || !response || response.value === undefined) resolve(defaultValue);
      else resolve(response.value as T);
    });
  });
}

async function pushSettings(): Promise<void> {
  const [wrapApi, classifierPolyfill] = await Promise.all([
    getSetting<boolean>('wrap_api', true),
    getSetting<boolean>(ClassifierSettingsKey.POLYFILL_ENABLED, true),
  ]);
  const data: SettingsPushData = { wrapApi: wrapApi !== false, classifierPolyfill: classifierPolyfill !== false };
  if (!data.wrapApi) console.log('WebAI Extension: API wrapping is disabled in settings.');
  window.postMessage({ type: WindowMessageType.SETTINGS_PUSH, data }, '*');
}

pushSettings();

// ---------------------------------------------------------------------------
// 2. Set up the window message dispatcher
//
// All messages from the injected script (page context) arrive via
// window.postMessage and are routed to the appropriate handler.
// ---------------------------------------------------------------------------

const dispatcher = new WindowMessageDispatcher();

window.addEventListener('message', (event) => {
  dispatcher.dispatch(event);
});

// ---------------------------------------------------------------------------
// 3. Handle requests from the side panel, devtools, or service worker
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  // Return current page sessions from memory
  if (request.action === RuntimeMessageAction.GET_PAGE_SESSIONS) {
    sendResponse({ data: ApiCallForwardHandler.getCurrentPageCalls() });
    return false;
  }

  // Classifier download progress relayed by the service worker is consumed by
  // ClassifierRuntimeClient's own listener; nothing to do here.
  if (request.action === RuntimeMessageAction.CLASSIFIER_PROGRESS) {
    return false;
  }

  if (request.action === RuntimeMessageAction.DIAGNOSE_APIS) {
    const messageId = 'webai-diag-' + Date.now() + '-' + Math.random();

    const listener = (event: any) => {
      if (event.source !== window) return;
      if (
        event.data &&
        event.data.type === WindowMessageType.DIAGNOSIS_EVAL_RESPONSE &&
        event.data.messageId === messageId
      ) {
        window.removeEventListener('message', listener);
        sendResponse({ data: event.data.data });
      }
    };

    window.addEventListener('message', listener);
    window.postMessage({
      type: WindowMessageType.DIAGNOSIS_EVAL_REQUEST,
      messageId,
    }, '*');

    // Return true to indicate we will send a response asynchronously
    return true;
  }

  return false;
});
