import { db } from './db';

declare const chrome: any;

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

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'log_api_call') {
    // Add sender origin/tab url if missing
    const payload = request.payload;
    if (!payload.origin && sender.tab?.url) {
      try {
        payload.origin = new URL(sender.tab.url).origin;
      } catch(e) {}
    }
    db.saveCall(payload).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error("Failed to save API call to IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === 'get_all_history') {
    db.getAllHistory().then(history => {
      sendResponse({ data: history });
    }).catch(err => {
      console.error("Failed to get all API history from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'get_history_item') {
    db.getHistoryItem(request.payload?.id).then(item => {
      sendResponse({ data: item });
    }).catch(err => {
      console.error("Failed to get API history item from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === 'get_api_history') {
    const origin = request.payload?.origin || (sender.tab?.url ? new URL(sender.tab.url).origin : null);
    const apiName = request.payload?.apiName || 'all';
    
    if (!origin) {
      sendResponse({ error: "Missing origin" });
      return false;
    }
    
    db.getHistory(origin, apiName).then(history => {
      sendResponse({ data: history });
    }).catch(err => {
      console.error("Failed to get API history from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === 'clear_api_history') {
    const origin = request.payload?.origin || (sender.tab?.url ? new URL(sender.tab.url).origin : null);
    
    if (!origin) {
      sendResponse({ error: "Missing origin" });
      return false;
    }
    
    db.clearHistory(origin).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error("Failed to clear API history from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === 'clear_all_history') {
    db.clearAllHistory().then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error("Failed to clear all API history from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === 'delete_api_session') {
    const origin = request.payload?.origin || (sender.tab?.url ? new URL(sender.tab.url).origin : null);
    const sessionId = request.payload?.sessionId;
    
    if (!origin || !sessionId) {
      sendResponse({ error: "Missing origin or sessionId" });
      return false;
    }
    
    db.deleteSession(origin, sessionId).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error("Failed to delete API session from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === 'getHardwareInformation') {
    Promise.all([
      new Promise(resolve => chrome.system.cpu.getInfo(resolve)),
      new Promise(resolve => chrome.system.memory.getInfo(resolve))
    ]).then(([cpuInfo, memoryInfo]) => {
      sendResponse({ cpu: cpuInfo, memory: memoryInfo });
    }).catch(error => {
      console.error("Failed to get hardware info", error);
      sendResponse({ error: error.message });
    });
    return true; 
  }

  if (request.action === 'get_setting') {
    db.getSetting(request.key, request.defaultValue).then(value => {
      sendResponse({ value });
    }).catch(err => {
      console.error("Failed to get setting from IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.action === 'set_setting') {
    db.setSetting(request.key, request.value).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error("Failed to set setting in IDB", err);
      sendResponse({ error: err.message });
    });
    return true;
  }

  return false;
});
