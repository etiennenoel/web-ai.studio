declare const chrome: any;

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
  return false;
});
