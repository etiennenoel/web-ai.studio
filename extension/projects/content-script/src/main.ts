import { WindowMessageType } from '../../shared/enums/window-message-type.enum';
import { RuntimeMessageAction } from '../../shared/enums/runtime-message-action.enum';
import { WindowMessageDispatcher } from './window-message-dispatcher';

declare const chrome: any;

console.log('WebAI Extension Content Script injected.');

// ---------------------------------------------------------------------------
// 1. Conditionally inject the page-context script
//
// The content script runs in an "isolated world" that shares the DOM but NOT
// the JavaScript context with the host page. We must inject a <script> tag
// to run code in the page's context (where Chrome AI APIs live).
// ---------------------------------------------------------------------------

chrome.runtime.sendMessage(
  { action: RuntimeMessageAction.GET_SETTING, key: 'wrap_api', defaultValue: true },
  (response: any) => {
    // If chrome.runtime.lastError occurs, we assume default (true)
    const wrapApi = response && response.value !== undefined ? response.value : true;

    if (wrapApi) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => {
        script.remove();
      };
    } else {
      console.log('WebAI Extension: API wrapping is disabled in settings.');
    }
  },
);

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
// 3. Handle diagnose_apis requests from the devtools panel
//
// The devtools panel sends this message via chrome.runtime to the content script.
// We forward it to the injected script (which can check window.LanguageModel etc.)
// and relay the response back.
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
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
