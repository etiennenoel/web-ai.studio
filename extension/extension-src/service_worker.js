chrome.runtime.onInstalled.addListener((details) => {
  // Check the reason for the event
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {

    // Open the welcome page
    chrome.tabs.create({
      url: "on-install/index.html" // This path is relative to the root of your extension
    });

  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.tabs.create({
      url: "on-install/index.html" // This path is relative to the root of your extension
    });

    // Optional: Handle updates (e.g., show patch notes)
    console.log("Extension updated to version " + chrome.runtime.getManifest().version);
  }
});
