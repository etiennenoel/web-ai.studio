import { db } from './db';
import { RuntimeMessageDispatcher } from './runtime-message-dispatcher';
import { RuntimeMessage } from '../../shared/interfaces/runtime-messages.interface';
import { RuntimeMessageAction } from '../../shared/enums/runtime-message-action.enum';

declare const chrome: any;

const dispatcher = new RuntimeMessageDispatcher(db);

chrome.action.onClicked.addListener((tab: any) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onInstalled.addListener((details: any) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({
      url: "on-install/index.html"
    });
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.tabs.create({
      url: "on-install/index.html"
    });
    console.log("Extension updated to version " + chrome.runtime.getManifest().version);
  }
});

chrome.runtime.onMessage.addListener(
  (request: RuntimeMessage, sender: any, sendResponse: (response: unknown) => void): boolean => {
    return dispatcher.dispatch(request, sender, sendResponse);
  },
);

// Warm up the Classifier polyfill runtime so the first availability() call on
// a page does not wait for the offscreen document to be created.
function warmUpClassifierRuntime(): void {
  dispatcher.dispatch({ action: RuntimeMessageAction.ENSURE_OFFSCREEN }, {}, (response: any) => {
    if (response?.error) console.warn('WebAI Extension: could not pre-create the classifier runtime', response.error);
  });
}
chrome.runtime.onInstalled.addListener(() => warmUpClassifierRuntime());
chrome.runtime.onStartup?.addListener(() => warmUpClassifierRuntime());
