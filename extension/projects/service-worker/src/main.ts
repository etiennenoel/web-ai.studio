import { db } from './db';
import { RuntimeMessageDispatcher } from './runtime-message-dispatcher';
import { RuntimeMessage } from '../../shared/interfaces/runtime-messages.interface';

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
